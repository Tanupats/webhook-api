-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "day" INTEGER NOT NULL,
    "subjects" JSONB NOT NULL DEFAULT '[]',
    "sheets" JSONB NOT NULL DEFAULT '[]',
    "status" BOOLEAN NOT NULL,
    "activate" BOOLEAN NOT NULL,
    "activate_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_id_key" ON "payment"("id");
