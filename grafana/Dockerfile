FROM grafana/grafana-oss:latest

# Copy provisioning and dashboards
COPY provisioning /etc/grafana/provisioning
COPY dashboards /var/lib/grafana/dashboards

# Cloud Run uses PORT env var (default 8080)
ENV GF_SERVER_HTTP_PORT=8080

# Embedding & anonymous access
ENV GF_AUTH_ANONYMOUS_ENABLED=true
ENV GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
ENV GF_AUTH_DISABLE_LOGIN_FORM=true
ENV GF_SECURITY_ALLOW_EMBEDDING=true
ENV GF_PANELS_DISABLE_SANITIZE_HTML=true

# Serve from /grafana sub-path
ENV GF_SERVER_SERVE_FROM_SUB_PATH=true

EXPOSE 8080
