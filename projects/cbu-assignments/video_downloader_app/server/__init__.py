"""WebSocket bridge server and live web dashboard for VDownloader OS."""

from .websocket_server import BrowserEvent, ExtensionWebSocketServer

__all__ = ["BrowserEvent", "ExtensionWebSocketServer"]
