// Pipeline para Jenkins en Windows con Docker Desktop.
// Requiere la credencial tipo "Secret file" con ID: pasteleria-env (tu archivo .env).
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    parameters {
        booleanParam(name: 'DEJAR_ACTIVO', defaultValue: false,
                     description: 'Dejar los contenedores corriendo al terminar (ver en http://localhost:3001)')
    }

    environment {
        // Proyecto y puerto distintos a los de tu uso manual para no chocar
        COMPOSE_PROJECT_NAME = 'pasteleria-ci'
        APP_PORT = '3001'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Verificar Docker') {
            steps {
                bat 'docker --version'
                bat 'docker compose version'
                bat 'docker ps'
            }
        }

        stage('Configurar entorno') {
            steps {
                withCredentials([file(credentialsId: 'pasteleria-env', variable: 'ENV_FILE')]) {
                    bat 'copy /Y "%ENV_FILE%" .env'
                }
                // El pipeline usa su propio puerto sin importar lo que diga el .env
                bat 'echo.>> .env'
                bat 'echo APP_PORT=%APP_PORT%>> .env'
            }
        }

        stage('Build y levantar') {
            steps {
                bat 'docker compose down -v --remove-orphans'
                bat 'docker compose up -d --build --wait --wait-timeout 180'
            }
        }

        stage('Smoke test') {
            steps {
                bat 'docker compose ps'
                bat '''powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:%APP_PORT%/api/productos; Write-Host ('HTTP ' + $r.StatusCode); if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { Write-Host $_; exit 1 }"'''
                bat '''powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:%APP_PORT%/; Write-Host ('HTTP ' + $r.StatusCode); if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { Write-Host $_; exit 1 }"'''
            }
        }
    }

    post {
        always {
            bat 'docker compose logs --no-color > logs.txt 2>&1 || exit /b 0'
            archiveArtifacts artifacts: 'logs.txt', allowEmptyArchive: true
            bat 'del /F /Q .env 2>nul || exit /b 0'
        }
        cleanup {
            script {
                if (!params.DEJAR_ACTIVO) {
                    bat 'docker compose down -v --remove-orphans || exit /b 0'
                }
            }
        }
    }
}
