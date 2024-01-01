function lspoints#util#bufnr_to_uri(bufnr) abort
  let bufname = bufname(a:bufnr)->fnamemodify(':p')
  if bufname =~# ':/'
    return bufname
  else
    return 'file://' .. bufname
  endif
endfunction

" Vim script側でjoin等やるのが速いので問題出るまでこうする
function lspoints#util#get_text(bufnr) abort
  let buf = getbufline(a:bufnr, 1, '$')
  " textDocumentの末尾には改行入ってるっぽいので
  eval buf->add('')
  return buf->join("\n")
endfunction
