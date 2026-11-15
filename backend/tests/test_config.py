from app.config import Settings


def test_local_development_env_overrides_hosted_env(tmp_path):
    hosted = tmp_path / ".env.local"
    local = tmp_path / ".env.development.local"
    hosted.write_text("SUPABASE_URL=https://hosted.example\nSUPABASE_SERVICE_ROLE_KEY=hosted-key\n")
    local.write_text("SUPABASE_URL=http://127.0.0.1:54321\nSUPABASE_SERVICE_ROLE_KEY=local-key\n")

    settings = Settings(_env_file=(hosted, local))

    assert settings.supabase_url == "http://127.0.0.1:54321"
    assert settings.supabase_service_role_key == "local-key"
