"""
mobilenet_seg.py — MobileNetV2 Segmentation Model
===================================================
Takes the standard MobileNetV2 backbone (torchvision) and replaces the
classification head with a lightweight ASPP-style decoder for pixel-wise
semantic segmentation (2 classes: background / plastic).

Architecture:
  Encoder : MobileNetV2 feature extractor (layers 0-18)
            Low-level skip  → output of layer  4  (24 ch,  H/4)
            High-level feat → output of layer 18  (1280 ch, H/32)
  Decoder : ASPP module (rates 1,6,12,18) on high-level features
            → concat with projected low-level skip
            → 3×3 conv + bilinear upsample ×4
            → 1×1 conv → num_classes logits at input resolution

Output  : single (B, num_classes, H, W) tensor  — same as ENet.
          No auxiliary heads → training script identical to train_enet.py.

Usage:
    from mobilenet_seg import MobileNetV2Seg
    model = MobileNetV2Seg(num_classes=2, pretrained=True)
    out   = model(x)   # (B, 2, H, W)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


# =============================================================================
# ASPP  (Atrous Spatial Pyramid Pooling)
# =============================================================================

class ASPPConv(nn.Sequential):
    def __init__(self, in_ch: int, out_ch: int, dilation: int):
        super().__init__(
            nn.Conv2d(in_ch, out_ch, 3, padding=dilation,
                      dilation=dilation, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )


class ASPPPooling(nn.Module):
    def __init__(self, in_ch: int, out_ch: int):
        super().__init__()
        self.pool = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(in_ch, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        size = x.shape[-2:]
        return F.interpolate(self.pool(x), size=size,
                             mode='bilinear', align_corners=False)


class ASPP(nn.Module):
    """Lightweight ASPP: rates {1, 6, 12, 18}, output 256 channels."""
    def __init__(self, in_ch: int, out_ch: int = 256,
                 rates=(1, 6, 12, 18)):
        super().__init__()
        self.convs = nn.ModuleList([
            nn.Sequential(
                nn.Conv2d(in_ch, out_ch, 1, bias=False),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True)),                 # 1×1
            *[ASPPConv(in_ch, out_ch, r) for r in rates[1:]],
            ASPPPooling(in_ch, out_ch),                 # global avg
        ])
        self.project = nn.Sequential(
            nn.Conv2d(out_ch * (len(rates) + 1), out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Dropout2d(0.1),
        )

    def forward(self, x):
        return self.project(torch.cat([c(x) for c in self.convs], dim=1))


# =============================================================================
# MobileNetV2 Segmentation Model
# =============================================================================

class MobileNetV2Seg(nn.Module):
    """
    MobileNetV2 encoder  +  ASPP decoder  →  pixel-wise segmentation.

    Args:
        num_classes (int): number of output classes (2 for plastic/background).
        pretrained   (bool): load ImageNet weights for the MobileNetV2 backbone.
        width_mult   (float): MobileNetV2 width multiplier (default 1.0).

    Forward:
        x   : (B, 3, H, W)  float32  normalised
        out : (B, num_classes, H, W)  logits  — same shape contract as ENet
    """

    # MobileNetV2 feature indices used as skip / high-level taps
    # layer 4  → stride-4  feature (24 channels @ width_mult=1.0)
    # layer 18 → stride-32 feature (1280 channels)
    _LOW_IDX  = 4
    _HIGH_IDX = 18

    def __init__(self, num_classes: int = 2,
                 pretrained: bool = True,
                 width_mult: float = 1.0):
        super().__init__()
        self.num_classes = num_classes

        # ── Backbone ──────────────────────────────────────────────────────────
        weights = (models.MobileNet_V2_Weights.IMAGENET1K_V2
                   if pretrained else None)
        base = models.mobilenet_v2(weights=weights, width_mult=width_mult)

        # Split feature extractor into low-level and high-level parts
        feats = list(base.features)
        self.low_encoder  = nn.Sequential(*feats[:self._LOW_IDX + 1])   # → H/4
        self.high_encoder = nn.Sequential(*feats[self._LOW_IDX + 1:])   # → H/32

        # Detect channel sizes automatically (width_mult-safe)
        with torch.no_grad():
            dummy = torch.zeros(1, 3, 224, 224)
            low_ch  = self.low_encoder(dummy).shape[1]
            high_ch = self.high_encoder(self.low_encoder(dummy)).shape[1]

        # ── Decoder ───────────────────────────────────────────────────────────
        aspp_ch = 256

        # ASPP on high-level features
        self.aspp = ASPP(high_ch, aspp_ch)

        # Project low-level skip to 48 ch  (DeepLabV3+ recipe)
        self.low_proj = nn.Sequential(
            nn.Conv2d(low_ch, 48, 1, bias=False),
            nn.BatchNorm2d(48),
            nn.ReLU(inplace=True),
        )

        # Fuse + refine
        self.fuse = nn.Sequential(
            nn.Conv2d(aspp_ch + 48, 256, 3, padding=1, bias=False),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.Conv2d(256, 256, 3, padding=1, bias=False),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
        )

        # Final classification head
        self.classifier = nn.Conv2d(256, num_classes, 1)

        # ── Weight init for decoder ───────────────────────────────────────────
        for m in [self.aspp, self.low_proj, self.fuse, self.classifier]:
            self._init_weights(m)

    @staticmethod
    def _init_weights(module):
        for m in module.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out',
                                        nonlinearity='relu')
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        input_size = x.shape[-2:]                      # (H, W)

        # Encoder
        low  = self.low_encoder(x)                     # (B, 24, H/4,  W/4)
        high = self.high_encoder(low)                  # (B, 1280, H/32, W/32)

        # Decoder — ASPP on high-level
        h = self.aspp(high)                            # (B, 256, H/32, W/32)

        # Upsample to match low-level spatial size
        h = F.interpolate(h, size=low.shape[-2:],
                          mode='bilinear', align_corners=False)

        # Fuse with projected low-level skip
        l = self.low_proj(low)                         # (B, 48, H/4, W/4)
        h = self.fuse(torch.cat([h, l], dim=1))        # (B, 256, H/4, W/4)

        # Classify + upsample to input resolution
        h = self.classifier(h)                         # (B, 2, H/4, W/4)
        h = F.interpolate(h, size=input_size,
                          mode='bilinear', align_corners=False)

        return h   # (B, num_classes, H, W)


# =============================================================================
# Smoke-test
# =============================================================================
if __name__ == "__main__":
    model = MobileNetV2Seg(num_classes=2, pretrained=False)

    total = sum(p.numel() for p in model.parameters())
    print(f"MobileNetV2Seg  total params: {total:,}  ({total/1e6:.2f}M)")

    x   = torch.randn(2, 3, 720, 1280)
    out = model(x)
    print(f"Input:  {tuple(x.shape)}")
    print(f"Output: {tuple(out.shape)}")   # expect (2, 2, 512, 512)
    assert out.shape == (2, 2, 720, 1280), "Shape mismatch!"
    print("\nmobilenet_seg.py OK")