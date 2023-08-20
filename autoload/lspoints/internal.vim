function lspoints#internal#notifychange(bufnr)
  let uri = lspoints#util#bufnr_to_uri(a:bufnr)
  let text = lspoints#util#get_text(a:bufnr)
  let changedtick = getbufvar(a:bufnr, 'changedtick')
  call denops#notify('lspoints', 'notifyChange', [a:bufnr, uri, text, changedtick])
endfunction
