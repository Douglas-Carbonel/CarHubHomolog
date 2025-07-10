
# Migração da Arquitetura de Serviços

## Resumo da Mudança

O sistema passou por uma grande consolidação arquitetural em Janeiro de 2025, centralizando toda a lógica de serviços na tabela `service_types` e criando a tabela `service_items` para relacionamentos múltiplos.

## Arquitetura Anterior (Descontinuada)

### Problemas da Arquitetura Antiga:
- **Tabelas Duplicadas**: `service_types` e `service_extras` faziam praticamente a mesma coisa
- **Lógica Fragmentada**: Serviços eram gerenciados em múltiplas tabelas
- **Complexidade Desnecessária**: Relacionamentos confusos entre tabelas
- **Manutenção Difícil**: Mudanças precisavam ser feitas em múltiplos lugares

### Tabelas Antigas (Removidas):
- `service_extras` - Substituída por `service_items`
- Campos duplicados em múltiplas tabelas

## Arquitetura Atual (Consolidada)

### Estrutura Principal:
1. **`service_types`** - Tabela central com todos os tipos de serviços
2. **`service_items`** - Tabela de relacionamento para múltiplos serviços por ordem
3. **`services`** - Tabela principal de ordens de serviço

### Benefícios da Nova Arquitetura:
- **Centralização**: Todos os tipos de serviços em um só lugar
- **Flexibilidade**: Um serviço pode ter múltiplos itens/tipos
- **Simplicidade**: Menos tabelas, menos complexidade
- **Manutenibilidade**: Mudanças centralizadas

## Fluxo de Dados Atual

### Criação de Serviço:
1. Cliente seleciona tipos de serviços disponíveis em `service_types`
2. Sistema cria entrada em `services` (serviço principal)
3. Sistema cria entradas em `service_items` para cada tipo selecionado
4. Cálculo automático de valores totais

### Estrutura `service_items`:
```sql
- id (PK)
- service_id (FK para services)
- service_type_id (FK para service_types)
- quantity (quantidade do serviço)
- unit_price (preço unitário)
- total_price (preço total = quantity * unit_price)
- notes (observações específicas do item)
```

## Migração Realizada

### Passos Executados:
1. ✅ Criação da tabela `service_items`
2. ✅ Migração de dados existentes para nova estrutura
3. ✅ Atualização de todas as APIs
4. ✅ Atualização do frontend
5. ✅ Manutenção da compatibilidade durante transição
6. ⏳ Remoção das tabelas antigas (service_extras)

### Compatibilidade:
- Frontend mantém funcionamento normal
- APIs antigas continuam funcionando
- Dados preservados durante migração

## Próximos Passos

### Limpeza Pendente:
- [ ] Remover tabela `service_extras`
- [ ] Remover códigos legados relacionados
- [ ] Atualizar documentação de API
- [ ] Verificar se há dependências restantes

### Monitoramento:
- Verificar se todos os fluxos funcionam corretamente
- Monitorar performance das queries
- Validar integridade dos dados

## Impacto no Desenvolvimento

### Para Desenvolvedores:
- **Novo padrão**: Sempre usar `service_items` para múltiplos serviços
- **Queries**: Fazer JOIN com `service_items` para obter detalhes
- **APIs**: Endpoints centralizados em `/api/service-types`

### Para Usuários:
- **Experiência**: Nenhuma mudança visível
- **Performance**: Melhor performance geral
- **Confiabilidade**: Menos bugs por complexidade reduzida

---

**Data da Migração**: Janeiro 2025  
**Status**: Concluída (pendente limpeza final)  
**Responsável**: Sistema automatizado de migração
