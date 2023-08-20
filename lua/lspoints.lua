local nss = {}

local M = {}

vim.api.nvim_create_autocmd('User', {
  pattern = 'DenopsPluginPre:lspoints',
  callback = function()
    for _, ns in pairs(nss) do
      vim.diagnostic.reset(ns)
    end
  end,
})

function M.notify(msg)
  if nss[msg.client] == nil then
    nss[msg.client] = vim.api.nvim_create_namespace('lspoints.diagnostics.' .. msg.client)
  end
  local ns = nss[msg.client]
  vim.diagnostic.reset(ns, msg.bufnr)
  vim.diagnostic.set(
    ns,
    msg.bufnr,
    vim
      .iter(msg.diagnostics)
      :map(function(d)
        return {
          lnum = d.range.start.line,
          end_lnum = d.range['end'].line,
          col = d.range.start.character,
          end_col = d.range['end'].character,
          severity = d.severity,
          message = d.message,
          source = d.source,
          code = d.code,
        }
      end)
      :totable()
  )
end

return M
