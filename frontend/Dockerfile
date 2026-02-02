FROM node:latest AS build

WORKDIR /usr/src/app

# accept build arg used by Vite
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:latest AS runtime

# RUN npm i -g serve

WORKDIR /usr/src/app
# Copy built app and node_modules from build stage so we can run the dev server
COPY --from=build /usr/src/app /usr/src/app

# ENV NODE_ENV=development

EXPOSE 4000
CMD ["npm", "run", "dev"]
# CMD ["serve", "-s", "dist", "-l", "4000"]