FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
ENV REACT_APP_GAMES_API=http://192.168.0.71:8001
ENV REACT_APP_RESULTS_API=http://192.168.0.71:8002
CMD ["npm", "start"]
