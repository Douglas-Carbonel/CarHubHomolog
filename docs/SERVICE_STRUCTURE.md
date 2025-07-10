
# Estrutura do Sistema de Serviços

## Visão Geral

O sistema de gerenciamento de serviços automotivos utiliza uma arquitetura consolidada e centralizada para máxima eficiência e flexibilidade.

## Tabelas Principais

### 1. `service_types`
**Propósito**: Catálogo central de todos os tipos de serviços disponíveis

**Campos**:
- `id` - Identificador único
- `name` - Nome do serviço (ex: "Troca de Óleo", "Alinhamento")
- `description` - Descrição detalhada do serviço
- `default_price` - Preço padrão sugerido
- `estimated_duration` - Duração estimada em minutos
- `is_active` - Status ativo/inativo
- `created_at` / `updated_at` - Timestamps

### 2. `services`
**Propósito**: Ordens de serviço principais (agendamentos)

**Campos Principais**:
- `id` - Identificador único da ordem
- `customer_id` - Cliente (FK)
- `vehicle_id` - Veículo (FK)
- `technician_id` - Técnico responsável (FK)
- `status` - Status da ordem (scheduled, in_progress, completed, cancelled)
- `scheduled_date` / `scheduled_time` - Data e hora do agendamento
- `estimated_value` / `final_value` - Valores estimado e final
- Campos de pagamento: `valor_pago`, `pix_pago`, `dinheiro_pago`, etc.

### 3. `service_items`
**Propósito**: Itens individuais dentro de uma ordem de serviço

**Campos**:
- `id` - Identificador único
- `service_id` - Ordem de serviço (FK)
- `service_type_id` - Tipo de serviço (FK)
- `quantity` - Quantidade (padrão: 1)
- `unit_price` - Preço unitário
- `total_price` - Preço total (quantity × unit_price)
- `notes` - Observações específicas do item

## Fluxo de Trabalho

### Criação de Nova Ordem de Serviço:

1. **Frontend**: Cliente seleciona serviços do catálogo (`service_types`)
2. **Cálculo**: Sistema calcula valores individuais e totais
3. **Persistência**: 
   - Cria registro em `services` (ordem principal)
   - Cria registros em `service_items` (um para cada serviço selecionado)
4. **Agendamento**: Define data, hora e técnico

### Exemplo Prático:

```sql
-- Ordem de serviço: Troca de óleo + Alinhamento
INSERT INTO services (customer_id, vehicle_id, estimated_value, ...)
VALUES (123, 456, 150.00, ...);

-- Item 1: Troca de óleo
INSERT INTO service_items (service_id, service_type_id, quantity, unit_price, total_price)
VALUES (789, 1, 1, 80.00, 80.00);

-- Item 2: Alinhamento  
INSERT INTO service_items (service_id, service_type_id, quantity, unit_price, total_price)
VALUES (789, 5, 1, 70.00, 70.00);
```

## Queries Comuns

### Buscar Serviços com Itens:
```sql
SELECT 
  s.*,
  si.quantity,
  si.unit_price,
  si.total_price,
  st.name as service_type_name
FROM services s
LEFT JOIN service_items si ON s.id = si.service_id
LEFT JOIN service_types st ON si.service_type_id = st.id
WHERE s.id = ?
```

### Relatório de Serviços Mais Vendidos:
```sql
SELECT 
  st.name,
  COUNT(si.id) as quantity_sold,
  SUM(si.total_price) as total_revenue
FROM service_items si
JOIN service_types st ON si.service_type_id = st.id
JOIN services s ON si.service_id = s.id
WHERE s.status = 'completed'
GROUP BY st.id, st.name
ORDER BY quantity_sold DESC
```

## Benefícios da Arquitetura

### 1. **Flexibilidade**
- Uma ordem pode ter múltiplos serviços
- Preços individualizados por item
- Quantidades diferentes para cada serviço

### 2. **Manutenibilidade**
- Catálogo centralizado de serviços
- Fácil adição de novos tipos
- Relatórios precisos e detalhados

### 3. **Escalabilidade**
- Estrutura normalizada
- Performance otimizada
- Consultas eficientes

## Migração e Compatibilidade

- ✅ Dados migrados automaticamente
- ✅ APIs mantêm compatibilidade
- ✅ Frontend funciona sem alterações
- ✅ Tabelas legadas removidas

---

**Última Atualização**: Janeiro 2025  
**Status**: Arquitetura consolidada e estável
