# Stage 1: Build Stage
FROM python:3.12-bookworm AS builder

WORKDIR /builder

RUN pip install poetry

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.in-project true

RUN poetry install --no-root

# Stage 2: Production Stage
FROM python:3.12-bookworm AS app

WORKDIR /app

COPY . .

COPY --from=builder /builder/.venv /app/.venv

ENV REACT_APP_DOMAIN=${REACT_APP_DOMAIN}
ENV SSL_CERT_BASE64=${SSL_CERT_BASE64}
ENV SSL_KEY_BASE64=${SSL_KEY_BASE64}
ENV MONGO_CONNECTION_STRING=${MONGO_CONNECTION_STRING}
ENV GROQ_API_KEY=${GROQ_API_KEY}
ENV GROQ_GPT_MODEL=${GROQ_GPT_MODEL}
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY}
ENV GOOGLE_CX=${GOOGLE_CX}

RUN mkdir ./SSL

EXPOSE 5000

ENV PATH="/app/.venv/bin:$PATH"

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

