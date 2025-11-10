Param(
  [string]$Message,
  [switch]$Push,
  [string]$Remote = "origin",
  [string]$Branch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Ensure-Git() {
  try {
    $v = git --version 2>$null
  } catch {
    Write-Host "Git não encontrado no PATH." -ForegroundColor Red
    throw
  }
}

function Ensure-Repo() {
  $inside = (git rev-parse --is-inside-work-tree 2>$null).Trim()
  if ($inside -ne 'true') {
    Write-Host "Esta pasta não parece ser um repositório Git." -ForegroundColor Red
    throw "Fora de um repositório Git"
  }
}

function Get-CurrentBranch() {
  $b = (git rev-parse --abbrev-ref HEAD).Trim()
  if ([string]::IsNullOrWhiteSpace($b)) { throw "Não foi possível obter a branch atual" }
  return $b
}

function Get-StagedFiles() {
  $out = git diff --cached --name-only
  # Sempre retornar um array
  return @($out -split '\r?\n' | Where-Object { $_ -ne '' })
}

function Get-ChangedFiles() {
  $out = git status --porcelain
  # Sempre retornar um array
  return @($out -split '\r?\n' | Where-Object { $_ -ne '' })
}

function Build-DefaultMessage($count) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  return "Auto-commit: $ts ($count arquivo(s))"
}

try {
  Ensure-Git
  Ensure-Repo

  # Estágio de alterações
  git add -A | Out-Null

  $staged = Get-StagedFiles
  $stagedCount = ($staged | Measure-Object).Count
  if ($stagedCount -eq 0) {
    # Nada staged: verificar se há mudanças não rastreadas
    $changed = Get-ChangedFiles
    $changedCount = ($changed | Measure-Object).Count
    if ($changedCount -eq 0) {
      Write-Host "Nada para commitar (working tree clean)." -ForegroundColor Yellow
      exit 0
    } else {
      # Às vezes git add pode falhar silenciosamente; tentar novamente explicitamente
      Write-Host "Detectadas mudanças não staged. Tentando novamente 'git add -A'..." -ForegroundColor Yellow
      git add -A | Out-Null
      $staged = Get-StagedFiles
      $stagedCount = ($staged | Measure-Object).Count
      if ($stagedCount -eq 0) {
        Write-Host "Ainda sem arquivos staged. Verifique permissões/arquivos ignorados." -ForegroundColor Red
        exit 1
      }
    }
  }

  # Mensagem de commit
  if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Host "Digite a mensagem do commit (Enter para automático):" -ForegroundColor Cyan
    $Message = Read-Host
    if ([string]::IsNullOrWhiteSpace($Message)) { $Message = Build-DefaultMessage $staged.Count }
  }

  # Commit
  Write-Host "Commitando $stagedCount arquivo(s)..." -ForegroundColor Green
  git commit -m $Message

  # Push opcional
  if ($Push.IsPresent) {
    $branchName = if ([string]::IsNullOrWhiteSpace($Branch)) { Get-CurrentBranch } else { $Branch }
    $remotes = (git remote).Trim().Split("`n")
    if (-not ($remotes -contains $Remote)) {
      Write-Host "Remoto '$Remote' não configurado. Pulando push." -ForegroundColor Yellow
      exit 0
    }
    # Verificar upstream via config (evita erro de PowerShell com @{u})
    $upRemote = (git config --get "branch.$branchName.remote" 2>$null)
    $upMerge  = (git config --get "branch.$branchName.merge" 2>$null)
    if ([string]::IsNullOrWhiteSpace($upRemote) -or [string]::IsNullOrWhiteSpace($upMerge)) {
      Write-Host "Upstream não configurado. Fazendo push com '-u $Remote $branchName'..." -ForegroundColor Green
      git push -u $Remote $branchName
    } else {
      Write-Host "Fazendo push para upstream configurado..." -ForegroundColor Green
      git push
    }
  }

  Write-Host "Pronto." -ForegroundColor Green
} catch {
  Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
