import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuid } from 'uuid'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não enviado' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const ext = file.name.split('.').pop()
    const fileName = `${uuid()}.${ext}`

    const uploadDir = path.join(process.cwd(), 'public/uploads')

    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    const imageUrl = `/uploads/${fileName}`

    if (session.role === 'coach') {
      await sql`
        UPDATE coaches
        SET avatar_url = ${imageUrl}
        WHERE id = ${session.id}
      `
    }

    if (session.role === 'student') {
      await sql`
        UPDATE students
        SET avatar_url = ${imageUrl}
        WHERE id = ${session.id}
      `
    }

    return NextResponse.json({
      success: true,
      imageUrl
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao fazer upload' },
      { status: 500 }
    )
  }
}