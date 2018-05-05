FROM python:3.6-slim

WORKDIR /app

ADD . /app

RUN pip install --trusted-host pypi.python.org -r requirements.txt

EXPOSE 80

ENV NAME aws

CMD ["python", "citadel_project.py"]

