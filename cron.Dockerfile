FROM debian:bookworm-slim
RUN apt-get update && apt-get upgrade -y
RUN apt-get install ca-certificates curl cron -y

WORKDIR /app

# TODO: use docker registry intead
# binary that sends out notifications
# https://github.com/Bladesheng/weather-station-notifications
RUN curl -LO https://github.com/Bladesheng/weather-station-notifications/releases/download/v1/forecast-notification
RUN chmod +x forecast-notification

# create log file to be able to run tail
RUN touch /app/cron.log

# install crontab
ENV TZ="Europe/Prague"
ENV CRON_TZ="Europe/Prague"
COPY crontab.txt .
RUN crontab crontab.txt

# copy env variables somewhere, where cron can access them
# https://stackoverflow.com/questions/65884276
CMD printenv > /etc/environment && cron && tail -f /app/cron.log
