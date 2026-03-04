import { PrismaClient } from '@prisma/client'

// Use the pooler URL from .env, but with password from .env.local and ?pgbouncer=true
const poolerUrl = "postgresql://postgres.rnpkiiwfbusloqasnqaz:amanpatil420@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient({
    datasources: {
        db: { url: poolerUrl }
    }
})

async function main() {
    try {
        const parties = await prisma.party.findMany()
        console.log(JSON.stringify({ success: true, count: parties.length, type: "pooler" }))
    } catch (e: any) {
        console.log(JSON.stringify({ success: false, name: e.name, message: e.message }))
    } finally {
        await prisma.$disconnect()
    }
}
main()
