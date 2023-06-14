-- CreateTable
CREATE TABLE "User" (
    "exId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("exId")
);

-- CreateTable
CREATE TABLE "FaxAppData" (
    "id" SERIAL NOT NULL,
    "selectedOrderItems" TEXT,
    "itemCodeShops" TEXT,
    "faxItems" TEXT,
    "faxContent" TEXT,
    "faxSendStatus" TEXT,
    "itemDetails" TEXT,
    "itemNames" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FaxAppData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaxAppData_userId_key" ON "FaxAppData"("userId");

-- AddForeignKey
ALTER TABLE "FaxAppData" ADD CONSTRAINT "FaxAppData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("exId") ON DELETE RESTRICT ON UPDATE CASCADE;
