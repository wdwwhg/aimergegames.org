FROM mcr.microsoft.com/playwright:v1.64.1-noble
WORKDIR /check
RUN npm init -y && npm install --save-exact playwright@1.64.1
COPY public/game-runtime.mjs ./game-runtime.mjs
COPY scripts/validator/check.mjs ./check.mjs
USER pwuser
ENTRYPOINT ["node", "check.mjs"]
