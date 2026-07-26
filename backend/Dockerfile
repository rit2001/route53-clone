FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY --chmod=755 entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/data /data && chown -R app:app /app /data
USER app

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
