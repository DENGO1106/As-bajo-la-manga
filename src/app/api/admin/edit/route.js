export const runtime = 'edge';
import { Client } from '@notionhq/client';

export async function PATCH(req) {
  try {
    const { password, pageId, nombre, descripcion, tragos, categoria } = await req.json();

    if (password !== '!DDeng@01106!') {
      return new Response(JSON.stringify({ error: 'Contrasena incorrecta' }), { status: 401 });
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN || process.env.NOTION_SECRET });
    const properties = {};

    if (nombre !== undefined) properties.Name = { title: [{ text: { content: nombre } }] };
    if (descripcion !== undefined) properties.Descripcion = { rich_text: [{ text: { content: descripcion } }] };
    if (tragos !== undefined) properties.Tragos = { number: tragos ? Number(tragos) : null };
    if (categoria !== undefined) properties.Categoria = { select: { name: categoria } };

    await notion.pages.update({
      page_id: pageId,
      properties: properties,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('Error Admin Edit API:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}