from fastapi.testclient import TestClient

from tests.test_business_admin_review import ADMIN, auth_header, create_test_app, registered_business

PDF_BYTES = b"%PDF-1.4 test certificate"


def upload(client, business_id, headers, name="gst.pdf", content=PDF_BYTES, mime="application/pdf"):
    return client.post(
        f"/business/{business_id}/gst-certificate",
        files={"file": (name, content, mime)},
        headers=headers,
    )


def test_owner_uploads_and_admin_downloads_certificate(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    owner = auth_header("business", "owner@example.com")

    response = upload(client, business["id"], owner)

    assert response.status_code == 200
    assert response.json()["gstCertificateName"] == "gst.pdf"
    assert response.json()["hasGstCertificateFile"] is True

    download = client.get(f"/business/{business['id']}/gst-certificate", headers=ADMIN)
    assert download.status_code == 200
    assert download.content == PDF_BYTES
    assert download.headers["content-type"] == "application/pdf"

    # The owner can also view their own file.
    assert client.get(f"/business/{business['id']}/gst-certificate", headers=owner).status_code == 200


def test_admin_list_shows_file_flag_without_bytes(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    upload(client, business["id"], auth_header("business", "owner@example.com"))

    listed = client.get("/business/admin/all", headers=ADMIN).json()[0]

    assert listed["hasGstCertificateFile"] is True
    assert "gst_certificate_data" not in listed


def test_other_users_cannot_upload_or_view(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    upload(client, business["id"], auth_header("business", "owner@example.com"))
    stranger = auth_header("business", "stranger@example.com")

    assert upload(client, business["id"], stranger).status_code == 403
    assert client.get(f"/business/{business['id']}/gst-certificate", headers=stranger).status_code == 403
    assert client.get(f"/business/{business['id']}/gst-certificate").status_code == 401


def test_rejects_wrong_type_empty_and_oversized_files(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    owner = auth_header("business", "owner@example.com")

    assert upload(client, business["id"], owner, name="gst.exe", mime="application/octet-stream").status_code == 400
    assert upload(client, business["id"], owner, content=b"").status_code == 400
    too_big = b"0" * (5 * 1024 * 1024 + 1)
    assert upload(client, business["id"], owner, content=too_big).status_code == 400


def test_download_404_when_no_file(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)

    assert client.get(f"/business/{business['id']}/gst-certificate", headers=ADMIN).status_code == 404
