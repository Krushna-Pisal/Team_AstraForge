# Windows bootstrap. Does not change the machine's execution policy.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$envPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $envPython)) {
    $pythonCandidates = @()
    $installRoot = Join-Path $env:LOCALAPPDATA 'Programs\Python'
    if (Test-Path -LiteralPath $installRoot) {
        $pythonCandidates += Get-ChildItem -LiteralPath $installRoot -Directory | ForEach-Object { Join-Path $_.FullName 'python.exe' }
    }
    $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($pythonCommand) { $pythonCandidates += $pythonCommand.Source }
    $selectedPython = $null
    foreach ($candidate in $pythonCandidates) {
        if (-not (Test-Path -LiteralPath $candidate)) { continue }
        try {
            & $candidate -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" 2>$null
            if ($LASTEXITCODE -eq 0) { $selectedPython = $candidate; break }
        } catch { continue }
    }
    if ($selectedPython) {
        & $selectedPython -m venv .venv
    } else {
        $launcher = Get-Command py.exe -ErrorAction SilentlyContinue
        if (-not $launcher) { throw 'Install Python 3.12+ and enable Add Python to PATH, then reopen the terminal.' }
        & $launcher.Source -3 -m venv .venv
    }
    if ($LASTEXITCODE -ne 0) { throw 'Could not create .venv. Install or repair Python 3.12+.' }
}
& $envPython (Join-Path $PSScriptRoot 'scripts\dev.py') @args
exit $LASTEXITCODE
