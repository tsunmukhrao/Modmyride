from app.routes.admin_images import image_extension, is_supported_image_signature, validate_image_batch


def test_image_batch_size_type_and_count_limits():
    assert validate_image_batch([{"size": 10, "type": "image/jpeg"}]) is None
    assert validate_image_batch([])
    assert validate_image_batch([{"size": 1, "type": "image/svg+xml"}])
    assert validate_image_batch([{"size": 8 * 1024 * 1024 + 1, "type": "image/png"}])
    assert validate_image_batch([{"size": 1, "type": "image/png"}] * 7)


def test_image_signature_checks_and_mime_extension_map():
    assert is_supported_image_signature("image/jpeg", b"\xff\xd8\xff\xe0")
    assert is_supported_image_signature("image/png", b"\x89PNG\r\n\x1a\n")
    assert not is_supported_image_signature("image/png", b"<svg/>")
    assert image_extension("image/webp") == "webp"
