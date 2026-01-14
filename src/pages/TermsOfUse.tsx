import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsOfUse() {
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
        <h1 className="text-3xl font-display font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 14 de janeiro de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Definições</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para os fins destes Termos de Uso, aplicam-se as seguintes definições:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong className="text-foreground">Plataforma:</strong> O aplicativo AI Trainer e todos os seus serviços associados.</li>
              <li><strong className="text-foreground">Usuário:</strong> Pessoa física que utiliza os serviços da Plataforma.</li>
              <li><strong className="text-foreground">Conta:</strong> Cadastro do Usuário na Plataforma.</li>
              <li><strong className="text-foreground">Treino:</strong> Programa de exercícios gerado pela inteligência artificial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Objeto</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AI Trainer é uma plataforma de criação de treinos personalizados utilizando inteligência artificial. 
              Nossos serviços incluem a geração de planos de treino adaptados ao perfil, objetivos e limitações de cada usuário, 
              bem como o acompanhamento do progresso e funcionalidades de gamificação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar os serviços da Plataforma, o Usuário deve:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Ter pelo menos 18 anos de idade ou consentimento do responsável legal;</li>
              <li>Fornecer informações verdadeiras, precisas e atualizadas;</li>
              <li>Manter a confidencialidade de suas credenciais de acesso;</li>
              <li>Notificar imediatamente sobre qualquer uso não autorizado de sua conta.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Obrigações do Usuário</h2>
            <p className="text-muted-foreground leading-relaxed">O Usuário compromete-se a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Utilizar a Plataforma de acordo com a legislação vigente e estes Termos;</li>
              <li>Não compartilhar sua conta com terceiros;</li>
              <li>Consultar um profissional de saúde antes de iniciar qualquer programa de exercícios;</li>
              <li>Fornecer informações precisas sobre condições de saúde e limitações físicas;</li>
              <li>Não utilizar a Plataforma para fins ilícitos ou não autorizados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Aviso de Saúde</h2>
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">IMPORTANTE:</strong> O AI Trainer NÃO substitui a orientação de profissionais 
                de educação física, médicos ou outros profissionais de saúde. Os treinos gerados são sugestões baseadas em 
                algoritmos de inteligência artificial e não constituem prescrição médica ou de exercícios. Antes de iniciar 
                qualquer programa de atividade física, consulte um profissional de saúde qualificado.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Propriedade Intelectual</h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da Plataforma, incluindo mas não se limitando a textos, gráficos, logos, ícones, imagens, 
              áudios, vídeos, softwares e algoritmos, é de propriedade exclusiva do AI Trainer ou de seus licenciadores, 
              protegido pelas leis de propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">O AI Trainer não se responsabiliza por:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Lesões ou problemas de saúde decorrentes da prática de exercícios;</li>
              <li>Resultados obtidos ou não obtidos com o uso da Plataforma;</li>
              <li>Interrupções ou falhas técnicas temporárias;</li>
              <li>Uso indevido da Plataforma pelo Usuário;</li>
              <li>Informações incorretas fornecidas pelo Usuário.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Assinaturas e Pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns recursos da Plataforma podem exigir assinatura paga. As condições de pagamento, preços e política 
              de cancelamento estão disponíveis na página de preços. O processamento de pagamentos é realizado por 
              terceiros (Stripe) e está sujeito aos termos de serviço destes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Cancelamento</h2>
            <p className="text-muted-foreground leading-relaxed">
              O Usuário pode cancelar sua conta a qualquer momento através das configurações da Plataforma. 
              O cancelamento de assinaturas pagas segue a política disponível na página de preços. 
              O AI Trainer reserva-se o direito de suspender ou encerrar contas que violem estes Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Modificações</h2>
            <p className="text-muted-foreground leading-relaxed">
              O AI Trainer pode modificar estes Termos a qualquer momento, mediante notificação prévia aos Usuários. 
              O uso continuado da Plataforma após as modificações constitui aceite dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Foro</h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca 
              de São Paulo/SP para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa 
              a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">12. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes Termos de Uso, entre em contato conosco através do email: 
              <a href="mailto:contato@aitrainer.com.br" className="text-primary hover:underline ml-1">
                contato@aitrainer.com.br
              </a>
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
