"""
Fast-SCNN: Fast Semantic Segmentation Network
Paper: https://arxiv.org/abs/1902.04502

Updated:
  - Increased Dropout in Classifier from 0.1 → 0.3 to reduce overfitting.
  - Fixed FeatureFusionModule: replaced fixed scale_factor upsampling with
    size=higher.shape[2:] to avoid spatial mismatch due to integer rounding
    when input resolution is not a perfect power-of-2 multiple (e.g. 720x1280).
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


# -------------------------------
# Basic Building Blocks
# -------------------------------

class _ConvBNReLU(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1,
                 padding=0, dilation=1, groups=1, bias=False):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size, stride,
                      padding, dilation, groups, bias=bias),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class _DSConv(nn.Module):
    """Depthwise Separable Convolution."""
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            _ConvBNReLU(in_channels, in_channels, 3, stride,
                        padding=1, groups=in_channels),
            _ConvBNReLU(in_channels, out_channels, 1),
        )

    def forward(self, x):
        return self.block(x)


class _DWConv(nn.Module):
    """Depthwise Convolution (no pointwise ReLU at end)."""
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, in_channels, 3, stride,
                      padding=1, groups=in_channels, bias=False),
            nn.BatchNorm2d(in_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(in_channels, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
        )

    def forward(self, x):
        return self.block(x)


# -------------------------------
# Linear Bottleneck (MobileNetV2)
# -------------------------------

class LinearBottleneck(nn.Module):
    def __init__(self, in_channels, out_channels, t=6, stride=2):
        super().__init__()
        self.use_shortcut = (stride == 1 and in_channels == out_channels)
        self.block = nn.Sequential(
            _ConvBNReLU(in_channels, in_channels * t, 1),
            _ConvBNReLU(in_channels * t, in_channels * t, 3, stride,
                        padding=1, groups=in_channels * t),
            nn.Conv2d(in_channels * t, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
        )

    def forward(self, x):
        out = self.block(x)
        if self.use_shortcut:
            out = out + x
        return out


# -------------------------------
# Pyramid Pooling Module
# -------------------------------

class PyramidPooling(nn.Module):
    def __init__(self, in_channels, out_channels):
        super().__init__()
        inter = in_channels // 4
        self.conv1 = _ConvBNReLU(in_channels, inter, 1)
        self.pool1 = nn.AdaptiveAvgPool2d(1)
        self.pool2 = nn.AdaptiveAvgPool2d(2)
        self.pool3 = nn.AdaptiveAvgPool2d(3)
        self.pool6 = nn.AdaptiveAvgPool2d(6)
        self.out   = _ConvBNReLU(inter * 5, out_channels, 1)

    def forward(self, x):
        h, w = x.shape[2], x.shape[3]
        x1   = self.conv1(x)

        def pool_up(pool):
            return F.interpolate(pool(x1), size=(h, w),
                                 mode='bilinear', align_corners=True)

        feat = torch.cat([x1,
                          pool_up(self.pool1),
                          pool_up(self.pool2),
                          pool_up(self.pool3),
                          pool_up(self.pool6)], dim=1)
        return self.out(feat)


# -------------------------------
# Feature Fusion Module  [FIXED]
# -------------------------------

class FeatureFusionModule(nn.Module):
    """
    Fuses the high-resolution feature map (higher) from LearningToDownsample
    with the low-resolution context map (lower) from GlobalFeatureExtractor.

    FIX: The original code used `scale_factor=4` for upsampling `lower`, which
    causes a spatial size mismatch when the input resolution is not an exact
    power-of-2 multiple (e.g. 720x1280 → higher=90x160, lower=23x40,
    23*4=92 ≠ 90). Now we upsample `lower` to `higher.shape[2:]` directly,
    guaranteeing the tensors are always the same spatial size before addition.
    """
    def __init__(self, higher_in, lower_in, out_channels, scale_factor=4):
        super().__init__()
        self.scale_factor = scale_factor          # kept for reference / logging
        self.dwconv       = _DWConv(lower_in, out_channels)
        self.conv_lower   = nn.Sequential(
            nn.Conv2d(out_channels, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
        )
        self.conv_higher  = nn.Sequential(
            nn.Conv2d(higher_in, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
        )
        self.relu = nn.ReLU(inplace=True)

    def forward(self, higher, lower):
        # ── KEY FIX ──────────────────────────────────────────────────────────
        # Use size=higher.shape[2:] instead of scale_factor to avoid off-by-one
        # spatial mismatches caused by integer rounding across stride-2 layers.
        lower  = F.interpolate(lower, size=higher.shape[2:],
                               mode='bilinear', align_corners=True)
        # ─────────────────────────────────────────────────────────────────────
        lower  = self.dwconv(lower)
        lower  = self.conv_lower(lower)
        higher = self.conv_higher(higher)
        return self.relu(lower + higher)


# -------------------------------
# Classifier Head
# -------------------------------

class Classifier(nn.Module):
    """
    Two DS-Conv layers → pixel-wise logits.
    Dropout raised from 0.1 → 0.3 to reduce overfitting.
    """
    def __init__(self, in_channels, num_classes, dropout=0.3):
        super().__init__()
        self.block = nn.Sequential(
            _DSConv(in_channels, in_channels),
            _DSConv(in_channels, in_channels),
            nn.Dropout(dropout),
            nn.Conv2d(in_channels, num_classes, 1),
        )

    def forward(self, x):
        return self.block(x)


# -------------------------------
# Fast-SCNN Sub-networks
# -------------------------------

class LearningToDownsample(nn.Module):
    """Three rapid stride-2 ops to produce a 1/8 resolution feature map."""
    def __init__(self, in_channels=3):
        super().__init__()
        self.conv    = _ConvBNReLU(in_channels, 32, 3, stride=2, padding=1)
        self.dsconv1 = _DSConv(32, 48, stride=2)
        self.dsconv2 = _DSConv(48, 64, stride=2)

    def forward(self, x):
        x = self.conv(x)
        x = self.dsconv1(x)
        x = self.dsconv2(x)
        return x


class GlobalFeatureExtractor(nn.Module):
    """MobileNetV2-style bottleneck stack + Pyramid Pooling."""
    def __init__(self, in_channels=64, block_channels=(64, 96, 128),
                 out_channels=128):
        super().__init__()
        t = 6
        self.bottleneck1 = self._make_layer(in_channels,       block_channels[0], t, 2, 3)
        self.bottleneck2 = self._make_layer(block_channels[0], block_channels[1], t, 2, 3)
        self.bottleneck3 = self._make_layer(block_channels[1], block_channels[2], t, 1, 3)
        self.ppm         = PyramidPooling(block_channels[2], out_channels)

    @staticmethod
    def _make_layer(in_c, out_c, t, stride, n):
        layers = [LinearBottleneck(in_c, out_c, t=t, stride=stride)]
        for _ in range(1, n):
            layers.append(LinearBottleneck(out_c, out_c, t=t, stride=1))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.bottleneck1(x)
        x = self.bottleneck2(x)
        x = self.bottleneck3(x)
        return self.ppm(x)


# -------------------------------
# Fast-SCNN (full model)
# -------------------------------

class FastSCNN(nn.Module):
    """
    Fast Semantic Segmentation Network.

    Args:
        in_channels : input channels (3 for RGB)
        num_classes : number of output classes (2 for binary segmentation)
        dropout     : dropout rate in the classifier head (default 0.3)
    """
    def __init__(self, in_channels=3, num_classes=2, dropout=0.3):
        super().__init__()
        self.learning_to_downsample   = LearningToDownsample(in_channels)
        self.global_feature_extractor = GlobalFeatureExtractor(
            in_channels=64, block_channels=(64, 96, 128), out_channels=128,
        )
        self.feature_fusion = FeatureFusionModule(
            higher_in=64, lower_in=128, out_channels=128, scale_factor=4,
        )
        self.classifier = Classifier(128, num_classes, dropout=dropout)

    def forward(self, x):
        h, w   = x.shape[2], x.shape[3]
        higher = self.learning_to_downsample(x)           # 1/8 resolution
        lower  = self.global_feature_extractor(higher)    # 1/32 resolution
        fused  = self.feature_fusion(higher, lower)       # back to 1/8
        logits = self.classifier(fused)
        return F.interpolate(logits, size=(h, w),         # back to full res
                             mode='bilinear', align_corners=True)


# -------------------------------
# Quick sanity check
# -------------------------------

if __name__ == '__main__':
    # Test with the exact resolution used in training (720x1280)
    model = FastSCNN(in_channels=3, num_classes=2, dropout=0.3)
    model.eval()

    for label, shape in [("720x1280 (train res)", (2, 3, 720, 1280)),
                          ("360x480  (half res)",  (2, 3, 360,  480)),
                          ("512x512  (square)",    (2, 3, 512,  512))]:
        x   = torch.randn(*shape)
        out = model(x)
        assert out.shape == (shape[0], 2, shape[2], shape[3]), \
            f"Shape mismatch: {out.shape}"
        print(f"  [{label}]  input {tuple(x.shape)} → output {tuple(out.shape)}  ✅")

    total     = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\nTotal params    : {total / 1e6:.3f} M")
    print(f"Trainable params: {trainable / 1e6:.3f} M")