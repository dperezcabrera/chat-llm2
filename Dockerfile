FROM python:3.12.0
LABEL maintainer "dperezcabrera@gmail.com"

WORKDIR /app

COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app .

EXPOSE 5000

CMD ["python", "./llama2_api.py"]
