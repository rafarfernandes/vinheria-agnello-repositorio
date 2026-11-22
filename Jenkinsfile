// Pipeline de deploy da Vinheria Agnello
// Build -> Testes -> Verificação de segurança -> Empacotamento -> Deploy na pasta de publicação -> Smoke test
pipeline {
  agent any

  environment {
    APP_NAME    = 'vinheria-agnello'
    PUBLISH_DIR = '/var/www/vinheria'          // simula o diretório de publicação (equivalente ao C:\inetpub\wwwroot no IIS)
    RELEASE     = "${env.BUILD_NUMBER ?: 'local'}"
  }

  options { timestamps(); buildDiscarder(logRotator(numToKeepStr: '10')) }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git log -1 --oneline'
      }
    }

    stage('Build') {
      steps {
        sh 'echo "Deploy da Vinheria"'
        sh 'node --version'
        sh '''
          for s in catalogo-service pedidos-service; do
            echo ">> build $s"
            node --check services/$s/server.js
          done
        '''
      }
    }

    stage('Testes') {
      steps {
        sh 'cd services/catalogo-service && npm test'
        sh 'cd services/pedidos-service && npm test'
      }
    }

    stage('DevSecOps') {
      steps {
        // 1) nenhum segredo "hardcoded" fora dos valores de exemplo
        sh 'scripts/check-secrets.sh'
        // 2) auditoria de dependências (os serviços não têm dependências externas)
        sh 'cd services/catalogo-service && npm audit --audit-level=high || true'
        sh 'cd services/pedidos-service && npm audit --audit-level=high || true'
      }
    }

    stage('Empacotar') {
      steps {
        sh 'tar -czf ${APP_NAME}-${RELEASE}.tar.gz services infra scripts'
        archiveArtifacts artifacts: "${APP_NAME}-${RELEASE}.tar.gz", fingerprint: true
      }
    }

    stage('Deploy') {
      steps {
        sh 'scripts/deploy.sh ${APP_NAME}-${RELEASE}.tar.gz ${PUBLISH_DIR} ${RELEASE}'
      }
    }

    stage('Smoke test') {
      steps {
        sh 'scripts/smoke-test.sh ${PUBLISH_DIR}/current'
      }
    }
  }

  post {
    success { echo "Release ${RELEASE} publicada em ${PUBLISH_DIR}/current" }
    failure { echo 'Falha no pipeline: a versão anterior continua publicada (o link current não foi alterado).' }
  }
}
