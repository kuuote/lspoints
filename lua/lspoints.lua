local namespaces = {}

local M = {}

vim.api.nvim_create_autocmd('User', {
  pattern = 'DenopsPluginPre:lspoints',
  callback = function()
    for _, namespace in pairs(namespaces) do
      vim.diagnostic.reset(namespace)
    end
  end,
})

function M.notify(msg)
  if namespaces[msg.client] == nil then
    namespaces[msg.client] = vim.api.nvim_create_namespace('lspoints.diagnostics.' .. msg.client)
  end
  local namespace = namespaces[msg.client]
  vim.diagnostic.reset(namespace, msg.bufnr)
  vim.diagnostic.set(namespace, msg.bufnr, msg.diagnostics)
end

function M.reset_diagnostics(client)
  if namespaces[client] ~= nil then
    vim.diagnostic.reset(namespaces[client])
  end
end

return M
