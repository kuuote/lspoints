function lspoints#util#bufnr_to_uri(bufnr)
  let bufname = bufname(a:bufnr)->fnamemodify(':p')
  if bufname =~# ':/'
    return bufname
  else
    return 'file://' .. bufname
  endif
endfunction

function lspoints#util#get_text(bufnr)
  let buf = getbufline(a:bufnr, 1, '$')
  " textDocumentの末尾には改行入ってるっぽいので
  eval buf->add('')
  return buf->join("\n")
endfunction
