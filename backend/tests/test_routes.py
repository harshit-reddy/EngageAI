"""Tests for Flask routes (admin, network)."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import json


class TestAdminLogin:
    def test_success(self, client):
        resp = client.post("/admin/login",
                           data=json.dumps({"username": "admin", "password": "engageai"}),
                           content_type="application/json")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["ok"] is True

    def test_wrong_password(self, client):
        resp = client.post("/admin/login",
                           data=json.dumps({"username": "admin", "password": "wrong"}),
                           content_type="application/json")
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["ok"] is False
        assert "error" in data

    def test_wrong_username(self, client):
        resp = client.post("/admin/login",
                           data=json.dumps({"username": "hacker", "password": "engageai"}),
                           content_type="application/json")
        assert resp.status_code == 401

    def test_empty_body(self, client):
        resp = client.post("/admin/login",
                           data=json.dumps({}),
                           content_type="application/json")
        assert resp.status_code == 401

    def test_no_json(self, client):
        resp = client.post("/admin/login")
        assert resp.status_code == 401


class TestHealthCheck:
    def test_root_returns_string(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"EngageAI" in resp.data

    def test_network_info(self, client):
        resp = client.get("/network-info")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "ip" in data
        assert "port" in data
        assert "ml" in data
