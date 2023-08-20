function s:post() abort
	call lspoints#load_extensions([
	\   'format',
	\   'nvim_diagnostics',
	\ ])
  call lspoints#settings#patch(#{
  \   tracePath: '/tmp/lspoints',
  \ })
endfunction

autocmd User DenopsPluginPost:lspoints call s:post()

function s:attach_denols() abort
  call lspoints#attach('denols', #{
  \   cmd: ['deno', 'lsp'],
  \   initializationOptions: #{
  \     enable: v:true,
  \     unstable: v:true,
  \     suggest: #{
  \       autoImports: v:false,
  \     },
  \   },
  \ })
endfunction

autocmd FileType typescript,typescriptreact call s:attach_denols()

function s:on_attach() abort
  nnoremap <buffer> mf <Cmd>call denops#request('lspoints', 'executeCommand', ['format', 'execute', bufnr()])<CR>
endfunction

autocmd User LspointsAttach:* call s:on_attach()
