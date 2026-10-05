from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.database import get_engine
from app.dependencies import get_current_user, require_permission
from app.assistant.schemas import ChatRequest, AnalysisRequest, ReportRequest
from app.assistant.orchestrator import process_chat
from app.assistant.analysis.comparison import compare_four_dates, contributors
from app.assistant.analysis.insights import build_insights
from app.assistant.reports.generators import make_pdf, make_pptx, make_xlsx

router = APIRouter(prefix="/api/assistant", tags=["BCP Intelligent Assistant"])


def _analysis(payload, engine):
    comparison = compare_four_dates(engine, payload.date_t0, payload.metric, payload.filters)
    if not comparison["dates"]:
        raise HTTPException(status_code=404, detail="Aucune date d’arrêt disponible.")
    tops = contributors(engine, payload.date_t0, payload.metric, "segment")
    return comparison, build_insights(comparison, tops)


@router.post("/chat")
def chat(payload: ChatRequest, engine=Depends(get_engine), user=Depends(get_current_user)):
    return process_chat(payload.message, payload.context.model_dump(), user, engine)


@router.post("/analyze")
def analyze(payload: AnalysisRequest, engine=Depends(get_engine), _user=Depends(get_current_user)):
    comparison, insights = _analysis(payload, engine)
    return {**comparison, "insights": insights}


@router.post("/compare")
def compare(payload: AnalysisRequest, engine=Depends(get_engine), _user=Depends(get_current_user)):
    comparison, insights = _analysis(payload, engine)
    return {**comparison, "insights": insights}


def _report(payload, fmt, engine):
    analysis, insights = _analysis(payload, engine)
    title = payload.title or "BCP Intelligent Assistant — Rapport d’analyse"
    if fmt == "pdf":
        body, media, extension = make_pdf(title, analysis, insights), "application/pdf", "pdf"
    elif fmt == "pptx":
        body, media, extension = make_pptx(title, analysis, insights), "application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"
    else:
        body, media, extension = make_xlsx(title, analysis, insights), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    return StreamingResponse(BytesIO(body), media_type=media, headers={"Content-Disposition": f'attachment; filename="bcp_assistant_report.{extension}"'})


@router.post("/report/pdf")
def report_pdf(payload: ReportRequest, engine=Depends(get_engine), _user=Depends(require_permission("peut_exporter"))):
    return _report(payload, "pdf", engine)


@router.post("/report/pptx")
def report_pptx(payload: ReportRequest, engine=Depends(get_engine), _user=Depends(require_permission("peut_exporter"))):
    return _report(payload, "pptx", engine)


@router.post("/report/excel")
def report_excel(payload: ReportRequest, engine=Depends(get_engine), _user=Depends(require_permission("peut_exporter"))):
    return _report(payload, "excel", engine)
