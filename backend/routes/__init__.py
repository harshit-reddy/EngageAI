"""Register all Flask route blueprints."""

from .admin import admin_bp
from .sessions import sessions_bp
from .meetings import meetings_bp
from .feedback import feedback_bp
from .network import network_bp


def register_routes(app):
    app.register_blueprint(admin_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(meetings_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(network_bp)
