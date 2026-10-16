FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /check
RUN npm init -y && npm install --save-exact playwright@1.64.1
COPY public/game-runtime.mjs ./public/game-runtime.mjs
COPY scripts/validator/check.mjs scripts/validator/browser-check.mjs ./scripts/validator/
USER pwuser
ENTRYPOINT ["node", "scripts/validator/check.mjs"]
