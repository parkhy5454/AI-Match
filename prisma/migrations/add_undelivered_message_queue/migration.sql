-- CreateTable OnlineStatus
CREATE TABLE "OnlineStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "socketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable UndeliveredMessage
CREATE TABLE "UndeliveredMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "UndeliveredMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable UndeliveredGroupMessage
CREATE TABLE "UndeliveredGroupMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupMessageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "isDelivered" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "UndeliveredGroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlineStatus_userId_key" ON "OnlineStatus"("userId");

-- CreateIndex
CREATE INDEX "OnlineStatus_isOnline_idx" ON "OnlineStatus"("isOnline");

-- CreateIndex
CREATE INDEX "OnlineStatus_lastSeen_idx" ON "OnlineStatus"("lastSeen");

-- CreateIndex
CREATE UNIQUE INDEX "UndeliveredMessage_messageId_key" ON "UndeliveredMessage"("messageId");

-- CreateIndex
CREATE INDEX "UndeliveredMessage_recipientId_idx" ON "UndeliveredMessage"("recipientId");

-- CreateIndex
CREATE INDEX "UndeliveredMessage_isDelivered_idx" ON "UndeliveredMessage"("isDelivered");

-- CreateIndex
CREATE INDEX "UndeliveredMessage_queuedAt_idx" ON "UndeliveredMessage"("queuedAt");

-- CreateIndex
CREATE INDEX "UndeliveredMessage_recipientId_isDelivered_idx" ON "UndeliveredMessage"("recipientId", "isDelivered");

-- CreateIndex
CREATE UNIQUE INDEX "UndeliveredGroupMessage_groupMessageId_key" ON "UndeliveredGroupMessage"("groupMessageId");

-- CreateIndex
CREATE INDEX "UndeliveredGroupMessage_userId_idx" ON "UndeliveredGroupMessage"("userId");

-- CreateIndex
CREATE INDEX "UndeliveredGroupMessage_isDelivered_idx" ON "UndeliveredGroupMessage"("isDelivered");

-- CreateIndex
CREATE INDEX "UndeliveredGroupMessage_queuedAt_idx" ON "UndeliveredGroupMessage"("queuedAt");

-- CreateIndex
CREATE INDEX "UndeliveredGroupMessage_userId_isDelivered_idx" ON "UndeliveredGroupMessage"("userId", "isDelivered");
