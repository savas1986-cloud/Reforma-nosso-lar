# Nossa Reforma 🏡

App web (React + Vite + Tailwind + Lucide) para acompanhar a reforma da casa, sincronizado em tempo real via Supabase.

## 1. Preparar o Supabase (uma vez só)

No painel do Supabase → **SQL Editor**, rode:

```sql
-- Valores padrão (para inserir cômodos sem precisar mandar tudo)
alter table public.reforma_comodos alter column status      set default 'Planejando';
alter table public.reforma_comodos alter column notas       set default '';
alter table public.reforma_comodos alter column fotos_antes set default '[]'::jsonb;
alter table public.reforma_comodos alter column fotos_hoje  set default '[]'::jsonb;
alter table public.reforma_comodos alter column ideias      set default '[]'::jsonb;
alter table public.reforma_comodos alter column created_at  set default now();
-- Se a coluna id NÃO tiver valor automático, rode também (se for uuid):
-- alter table public.reforma_comodos alter column id set default gen_random_uuid();

-- Permissões (RLS): libera leitura/escrita para o app
alter table public.reforma_comodos enable row level security;
create policy "app_reforma_acesso" on public.reforma_comodos
  for all to anon, authenticated using (true) with check (true);

-- Liga o tempo real (Realtime) nesta tabela
alter publication supabase_realtime add table public.reforma_comodos;
```

> ⚠️ Com essa política, qualquer pessoa que tiver o link do app consegue ver/editar. Não divulgue o link publicamente.

## 2. Rodar no computador

```bash
npm install
npm run dev
```

## 3. Publicar na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project →** escolha o repositório (ela detecta Vite sozinha).
3. (Opcional) Em *Environment Variables*, defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` — se não definir, o app usa as credenciais que já estão em `src/lib/supabase.js`.
4. Abra o link nos dois celulares e use **"Adicionar à tela inicial"** para virar ícone de app.

## Como funciona

- `src/lib/image.js` — redimensiona fotos para no máx. 800px e comprime em JPEG 0.7 (Canvas) antes de salvar em Base64.
- `src/lib/useComodos.js` — carrega, cria os 3 cômodos de exemplo se a tabela estiver vazia, escuta o Realtime e salva as alterações. Alterações em fotos/ideias são aplicadas sobre a versão mais recente do banco, para não perder nada se vocês dois editarem ao mesmo tempo.
- Ao voltar para o app (celular desbloqueado / internet de volta), ele recarrega tudo automaticamente.

**Dica futura:** se o número de fotos crescer muito (dezenas por cômodo), vale migrar as imagens para o Supabase Storage e guardar só o link no JSON.
