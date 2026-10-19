import pytest
from httpx import ASGITransport, AsyncClient

from src.app import app

transport = ASGITransport(app=app)


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/"),
        ("GET", "/upload/files"),
        ("GET", "/upload/recent_files"),
        ("GET", "/upload/audit_trail"),
        ("POST", "/upload/documents"),
        ("DELETE", "/upload/delete_document"),
        ("GET", "/chat/conversations"),
        ("GET", "/chat/conversation/00000000-0000-0000-0000-000000000000"),
        ("POST", "/response_generation/answer"),
        ("GET", "/contact/open_tickets"),
        ("GET", "/contact/all_tickets"),
        ("PUT", "/contact/update_status"),
        ("POST", "/contact/ticket"),
        ("GET", "/contact/tickets/files/attachment.txt"),
        ("GET", "/auth/all_users"),
    ],
)
@pytest.mark.asyncio
async def test_protected_routes_reject_requests_without_token(method, path):
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.request(method, path)

    assert response.status_code == 401, response.text


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/contact/open_tickets"),
        ("GET", "/contact/all_tickets"),
        ("PUT", "/contact/update_status?ticket_id=00000000-0000-0000-0000-000000000000&new_status=closed"),
        ("GET", "/contact/tickets/files/missing.txt"),
    ],
)
@pytest.mark.asyncio
async def test_non_admin_cannot_review_tickets(method, path, user_headers):
    async with AsyncClient(
        transport=transport, base_url="http://test", headers=user_headers
    ) as client:
        response = await client.request(method, path)

    assert response.status_code == 403, response.text
