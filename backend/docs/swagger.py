"""Swagger / OpenAPI documentation configuration for EngageAI."""

SWAGGER_TEMPLATE = {
    "info": {
        "title": "EngageAI API",
        "description": (
            "Real-time engagement detection backend — "
            "Flask + Flask-SocketIO + MediaPipe + GradientBoosting ML.\n\n"
            "**Auth**: Admin routes require `Authorization: Bearer <token>` header. "
            "Obtain a token via `POST /admin/login`."
        ),
        "version": "6.0.0",
        "contact": {"name": "EngageAI Team"},
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT token — format: `Bearer <token>`",
        }
    },
    "tags": [
        {"name": "Auth", "description": "Admin authentication"},
        {"name": "Sessions", "description": "Meeting session CRUD + monitoring"},
        {"name": "Meetings", "description": "Meeting history & analytics"},
        {"name": "Feedback", "description": "Participant feedback"},
        {"name": "System", "description": "Health check & network info"},
    ],
}

SWAGGER_CONFIG = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/docs",
}
