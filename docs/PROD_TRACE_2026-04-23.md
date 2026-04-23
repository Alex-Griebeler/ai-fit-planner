# Rastreabilidade de Produção — 2026-04-23

Documento de auditoria que registra o estado exato publicado em produção e o
alinhamento entre repositório oficial e banco gerenciado (Lovable Cloud).

> Este arquivo é puramente documental. Nenhuma alteração de schema, dados,
> lógica de aplicação ou edge function foi realizada nesta tarefa.

---

## 1. Produção (URLs)

- **Preview**: https://id-preview--72ec6a3e-a6bb-424f-9c35-0243c1fd7cbf.lovable.app
- **Publicado**: https://smartfit-starter.lovable.app

## 2. Git — branch e commit publicado

```
$ git rev-parse --abbrev-ref HEAD
edit/edt-ce4abe0e-18ee-4fef-82f3-22a6dd9bf2bd

$ git rev-parse --short HEAD
5592805
```

- **Branch atual**: `edit/edt-ce4abe0e-18ee-4fef-82f3-22a6dd9bf2bd`
- **Commit publicado**: `5592805`

## 3. Migration de `birth_date` — Repo vs Banco

### 3.1 Arquivo no repositório

```
$ ls -1 supabase/migrations | grep 20260423
20260423115913_e34bc2d2-b74a-4359-9b46-1a6046f7a3c7.sql
```

- **Migration oficial no repo**: `20260423115913_e34bc2d2-b74a-4359-9b46-1a6046f7a3c7.sql`

### 3.2 Versão registrada no banco

```sql
SELECT version FROM supabase_migrations.schema_migrations
WHERE version LIKE '20260423%'
ORDER BY version;

  version
---------------
 20260423115912
```

- **Versão registrada no banco**: `20260423115912`

### 3.3 Estado funcional do schema (idêntico ao esperado)

Coluna:

```
 column_name | data_type
-------------+-----------
 birth_date  | date
```

Constraint:

```
         conname           |                                  pg_get_constraintdef
---------------------------+---------------------------------------------------------------------------------------------------------
 profiles_birth_date_check | CHECK (((birth_date IS NULL) OR ((birth_date >= '1900-01-01'::date) AND (birth_date <= CURRENT_DATE))))
```

## 4. Drift de rastreabilidade detectado

| Camada     | Identificador                                                  |
|------------|----------------------------------------------------------------|
| Repositório| `20260423115913_e34bc2d2-b74a-4359-9b46-1a6046f7a3c7.sql`      |
| Banco      | `20260423115912`                                               |
| Diferença  | **+1 segundo no timestamp do nome do arquivo** (`...12` vs `...13`) |

- O **conteúdo SQL** do arquivo no repositório é equivalente ao schema atualmente
  aplicado em produção (coluna `birth_date date` + CHECK
  `profiles_birth_date_check` com a mesma definição).
- A divergência é **somente no metadado de versão** (timestamp do nome do
  arquivo da migration), não no schema funcional.

## 5. Decisão tomada (Opção A — registrada anteriormente)

- **Aceitar o drift de timestamp** como ruído de governança neste momento.
- **Não reaplicar SQL** (regra: não tocar em schema/banco).
- **Não renomear** o arquivo da migration neste commit (regra: não alterar
  conteúdo funcional / não embaralhar histórico do repo).
- Reconciliação formal de histórico de migrations será tratada em **tarefa
  separada** após o publish.

## 6. Veredito

- **Schema em produção**: íntegro e funcional (`birth_date` + constraint OK).
- **Rastreabilidade documental**: fechada por este arquivo.
- **Governança de migration**: drift conhecido, aceito e registrado.
- **Status final**: **GO** para operação. Reconciliação de histórico fica como
  follow-up não-bloqueante.
