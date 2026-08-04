"""schemas.py — response contracts. Field names on SegmentationResponse are
additive to what src/services/api.js already expects from runInference()
(jobId, status, mode, filename), nothing is renamed or removed."""

from typing import List, Optional
from pydantic import BaseModel


class ClassBreakdown(BaseModel):
    name: str
    pixels: int
    percentage: float
    colorHex: str


class SegmentationResponse(BaseModel):
    success: bool = True
    jobId: str
    status: str = "complete"
    mode: str = "segmentation"
    filename: str
    model: str
    coveragePercent: float
    plasticPixels: int
    backgroundPixels: int
    totalPixels: int
    objectsFound: int
    largestRegionPixels: int
    processingTime: str
    imageWidth: int
    imageHeight: int
    maskUrl: str
    overlayUrl: str
    classes: List[ClassBreakdown]
    note: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
