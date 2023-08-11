local ns = vim.api.nvim_create_namespace('lspoints.diagnostics')

local M = {}

function M.notify(msg)
  if msg and msg.method == 'textDocument/publishDiagnostics' then
    vim.diagnostic.reset(ns, 0)
    vim.diagnostic.set(
      ns,
      0,
      vim
        .iter(msg.params.diagnostics)
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
end

return M
