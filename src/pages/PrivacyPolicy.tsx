import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold">AI Trainer</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container max-w-4xl mx-auto px-4 py-8 pb-24"
      >
        <h1 className="text-3xl font-display font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 14 de janeiro de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Controlador dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AI Trainer, com sede na cidade de São Paulo/SP, é o controlador dos dados pessoais 
              coletados através desta plataforma, nos termos da Lei Geral de Proteção de Dados 
              (Lei nº 13.709/2018 - LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Dados Pessoais Coletados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Coletamos os seguintes dados pessoais:</p>
            
            <h3 className="text-lg font-medium text-foreground mb-2">2.1 Dados de Identificação</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mb-4">
              <li>Nome completo</li>
              <li>Endereço de email</li>
              <li>Idade</li>
              <li>Gênero</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2">2.2 Dados Biométricos e de Saúde (Dados Sensíveis)</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mb-4">
              <li>Peso e altura</li>
              <li>Condições de saúde declaradas</li>
              <li>Lesões e áreas do corpo com restrições</li>
              <li>Nível de estresse e qualidade do sono</li>
              <li>Histórico de exercícios e performance</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2">2.3 Dados de Uso</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Treinos realizados e cargas utilizadas</li>
              <li>Preferências de treino</li>
              <li>Progresso e conquistas</li>
              <li>Dados de navegação na plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Finalidade do Tratamento</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Os dados pessoais são tratados para as seguintes finalidades:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Personalização de treinos:</strong> Gerar planos de exercícios adaptados ao seu perfil e objetivos;</li>
              <li><strong className="text-foreground">Acompanhamento de progresso:</strong> Monitorar sua evolução e ajustar recomendações;</li>
              <li><strong className="text-foreground">Segurança:</strong> Considerar condições de saúde para evitar exercícios inadequados;</li>
              <li><strong className="text-foreground">Comunicação:</strong> Enviar notificações sobre treinos, conquistas e lembretes;</li>
              <li><strong className="text-foreground">Melhoria do serviço:</strong> Aprimorar nossos algoritmos e funcionalidades;</li>
              <li><strong className="text-foreground">Cumprimento legal:</strong> Atender obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Base Legal</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              O tratamento dos seus dados pessoais é realizado com base nas seguintes hipóteses legais da LGPD:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Consentimento (Art. 7º, I e Art. 11, I):</strong> Para dados sensíveis de saúde, mediante consentimento específico e destacado;</li>
              <li><strong className="text-foreground">Execução de contrato (Art. 7º, V):</strong> Para prestação dos serviços contratados;</li>
              <li><strong className="text-foreground">Legítimo interesse (Art. 7º, IX):</strong> Para melhoria dos serviços e segurança da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Seus dados podem ser compartilhados com:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Processadores de pagamento (Stripe):</strong> Para processar transações financeiras;</li>
              <li><strong className="text-foreground">Provedores de infraestrutura (Supabase):</strong> Para armazenamento seguro de dados;</li>
              <li><strong className="text-foreground">Serviços de IA:</strong> Para geração de treinos personalizados (dados anonimizados quando possível);</li>
              <li><strong className="text-foreground">Autoridades competentes:</strong> Quando exigido por lei ou ordem judicial.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Não vendemos, alugamos ou comercializamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Armazenamento e Retenção</h2>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados são armazenados em servidores seguros com criptografia. Mantemos seus dados enquanto 
              sua conta estiver ativa ou conforme necessário para prestação dos serviços. Após o encerramento 
              da conta, os dados serão retidos pelo período exigido por lei ou deletados conforme sua solicitação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Seus Direitos (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Conforme a LGPD, você tem os seguintes direitos:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los;</li>
              <li><strong className="text-foreground">Correção:</strong> Solicitar correção de dados incompletos ou desatualizados;</li>
              <li><strong className="text-foreground">Anonimização ou bloqueio:</strong> Para dados desnecessários ou excessivos;</li>
              <li><strong className="text-foreground">Portabilidade:</strong> Receber seus dados em formato estruturado;</li>
              <li><strong className="text-foreground">Eliminação:</strong> Solicitar exclusão dos dados tratados com consentimento;</li>
              <li><strong className="text-foreground">Informação:</strong> Saber com quem seus dados foram compartilhados;</li>
              <li><strong className="text-foreground">Revogação:</strong> Retirar o consentimento a qualquer momento;</li>
              <li><strong className="text-foreground">Oposição:</strong> Se opor ao tratamento em casos de descumprimento da LGPD.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, lembrar suas preferências 
              e analisar o uso da plataforma. Você pode gerenciar suas preferências de cookies através das 
              configurações do seu navegador. A desativação de cookies pode afetar algumas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-3">
              <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso;</li>
              <li>Controle de acesso baseado em funções (RLS);</li>
              <li>Autenticação segura com proteção contra senhas vazadas;</li>
              <li>Monitoramento contínuo de segurança;</li>
              <li>Backups regulares e redundância de dados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Encarregado de Proteção de Dados (DPO)</h2>
            <div className="p-4 rounded-lg bg-card border border-border">
              <p className="text-muted-foreground leading-relaxed">
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, 
                entre em contato com nosso Encarregado de Proteção de Dados:
              </p>
              <p className="text-foreground font-medium mt-3">
                Email: <a href="mailto:dpo@aitrainer.com.br" className="text-primary hover:underline">dpo@aitrainer.com.br</a>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Transferência Internacional</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns de nossos prestadores de serviços podem estar localizados fora do Brasil. Nesses casos, 
              garantimos que a transferência internacional de dados ocorra em conformidade com a LGPD, 
              mediante cláusulas contratuais padrão ou outras garantias adequadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Menores de Idade</h2>
            <p className="text-muted-foreground leading-relaxed">
              A plataforma não é destinada a menores de 18 anos sem consentimento do responsável legal. 
              Se tomarmos conhecimento de que coletamos dados de menor sem consentimento adequado, 
              tomaremos medidas para excluir essas informações.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">13. Atualizações desta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos você sobre 
              mudanças significativas através do email cadastrado ou de aviso na plataforma. 
              Recomendamos revisar esta política regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">14. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas gerais sobre esta Política de Privacidade:
            </p>
            <p className="text-foreground mt-2">
              Email: <a href="mailto:privacidade@aitrainer.com.br" className="text-primary hover:underline">privacidade@aitrainer.com.br</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o início
            </Link>
          </Button>
        </div>
      </motion.main>
    </div>
  );
}
