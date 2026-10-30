# Contas e login Google

## Começar localmente

1. Abra o PowerShell na pasta `p47-aurora-3d`.
2. Execute `npm install` se as dependências ainda não estiverem instaladas.
3. Execute `npm start`.
4. Abra **http://localhost:4180** (use exatamente esse endereço).
5. Escolha **Criar conta**, informe usuário e senha de pelo menos 12 caracteres.
6. Guarde o código de recuperação mostrado uma única vez. Clique para entrar no jogo.

O usuário não precisa ser um e-mail. Recuperação usa o código, não envio de e-mail. Após recuperar a conta, o código anterior deixa de funcionar e um novo é exibido. A opção **Alterar senha** aparece acima do jogo e encerra as outras sessões. **Sair da conta** revoga a sessão atual.

Abrir `index.html` diretamente continua sendo uma prévia offline sem contas. Um servidor de arquivos Python também não implementa autenticação. Para proteger o acesso e usar contas, inicie o servidor Node com `npm start`.

## Como foi implementado

- Node.js serve o jogo e a API na mesma origem; nenhuma senha é guardada no localStorage.
- Senhas: scrypt com salt aleatório por usuário, N=65536, r=8, p=2; comparação em tempo constante.
- Contas em `data/users.json`, arquivo privado fora das rotas públicas. O código de recuperação é armazenado apenas como SHA-256 de um segredo aleatório de 256 bits.
- Sessões: tokens aleatórios em cookie HttpOnly, SameSite=Lax e Secure quando APP_ORIGIN usa HTTPS. Expiram após oito horas. Reiniciar o servidor encerra sessões, mas preserva contas.
- CSRF: token da sessão e verificação de Origin nas operações POST. Há limites de tentativas por IP e de cálculos de senha simultâneos.
- Cadastro e recuperação exibem o código uma vez. Não existe senha padrão nem conta administrativa embutida.
- O servidor não publica `data/`, arquivos de configuração, código do servidor, node_modules ou testes. O jogo e sua página de construções exigem sessão no servidor.
- O jogo ainda roda no cliente: não há ranking confiável, gravação de progresso ou validação de pontuação no servidor nesta etapa.
- Este armazenamento é para uma instância local pequena. Antes de escalar, migre usuários para banco transacional e sessões/limites para um armazenamento compartilhado. Mantenha backups privados de `data/`. Não execute múltiplas instâncias sobre o mesmo JSON.

## Ativar Google (ainda depende das suas credenciais)

O fluxo já está implementado, mas permanece indisponível até configurar o aplicativo. Não existe login Google simulado.

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e configure o Google Auth Platform: nome do aplicativo, contato e público de teste. Adicione sua conta como usuário de teste quando exigido.
2. Crie um cliente OAuth do tipo **Aplicativo da Web**.
3. Cadastre exatamente o URI de redirecionamento `http://localhost:4180/auth/google/callback`.
4. No PowerShell, antes de iniciar o servidor, configure:

```powershell
$env:GOOGLE_CLIENT_ID = 'seu-client-id.apps.googleusercontent.com'
$env:GOOGLE_CLIENT_SECRET = 'seu-client-secret'
$env:APP_ORIGIN = 'http://localhost:4180'
npm start
```

O segredo fica somente no ambiente do servidor. Não o coloque em arquivos JavaScript do navegador, prints ou commits. Não é necessário enviar esse segredo no chat.

5. Abra o jogo no Chrome, Edge ou Firefox e use **Continuar com Google**. O Google pode bloquear autenticação em navegadores incorporados.

A integração usa a biblioteca oficial `google-auth-library`, autorização por código com PKCE, state e nonce. O servidor verifica assinatura, emissor e audiência do ID token pela biblioteca, e confere o nonce. Contas Google são identificadas por `sub`; não há vinculação automática por e-mail a uma conta local. A senha de uma conta Google é gerenciada pelo Google.

Os testes automatizados validam estados, nonce e chamada de verificação com um cliente simulado. O fluxo real do Google só poderá ser testado após você configurar credenciais e concluir o login no navegador.

## Publicar depois

Configure `APP_ORIGIN` como a origem HTTPS pública, sem barra final, e adicione o correspondente `/auth/google/callback` ao cliente OAuth. Use um proxy HTTPS e processo Node privado. `HOST` e `PORT` podem ser configurados conforme a hospedagem. Não exponha o servidor local por túnel sem configurar a implantação. Em produção, o proxy deve limitar tentativas e fornecer uma estratégia explícita para IP real; a versão atual limita pelo IP da conexão e não confia em cabeçalhos de proxy.

Referências: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [OAuth para aplicativos Web](https://developers.google.com/identity/protocols/oauth2/web-server), [Node crypto](https://nodejs.org/api/crypto.html).
