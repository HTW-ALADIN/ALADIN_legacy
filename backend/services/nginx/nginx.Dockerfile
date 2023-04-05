FROM nginx:1.19

EXPOSE 3000:8000

# RUN apt-get update
# RUN apt-get install software-properties-common
# RUN add-apt-repository ppa:certbot/certbot
# RUN apt-get update
# RUN apt-get install python-certbot-nginx
# RUN echo " " | certbot --nginx

# RUN apt install ufw
# RUN systemctl start ufw && systemctl enable ufw
# RUN ufw allow http
# RUN ufw allow https
# RUN ufw enable