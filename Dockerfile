FROM node:20-alpine

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# Prisma 생성
RUN npx prisma generate

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3000

# 환경 변수
ENV NODE_ENV=production

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 시작 명령
CMD ["npm", "start"]
