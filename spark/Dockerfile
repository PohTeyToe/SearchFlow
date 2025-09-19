FROM bitnami/spark:3.5

USER root

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app/
WORKDIR /app

USER 1001
