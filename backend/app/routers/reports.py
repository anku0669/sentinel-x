"""PDF Report export endpoint."""
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from ..schemas import ReportRequest
from ..security import get_current_user
from ..models.user import User
from ..services import report_gen

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/generate")
async def generate_report(
    req: ReportRequest,
    user: User = Depends(get_current_user),
):
    """Generate and stream a PDF security engagement report."""
    try:
        pdf_bytes = report_gen.generate_report(
            target=req.target,
            analyst=user.username,
            findings=req.findings,
            scan_meta=req.scan_meta,
        )
    except Exception as exc:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Report generation failed: {exc}")

    safe_name = req.target.replace("/", "_").replace(" ", "_")[:50]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="sentinelx-report-{safe_name}.pdf"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )
