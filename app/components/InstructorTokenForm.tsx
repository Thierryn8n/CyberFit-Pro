'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Warning, Envelope, User, IdentificationCard, Phone, ChalkboardTeacher } from '@phosphor-icons/react';
import { supabase } from '../lib/supabase';
import { validarEmail, validarCPF, formatarCPF, formatarTelefoneInternacional } from '../lib/validators';
import { cn } from '../lib/utils';

interface InstructorInviteFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  email?: string;
  fullName?: string;
  cpf?: string;
  telefone?: string;
  submit?: string;
}

interface FormData {
  email: string;
  fullName: string;
  cpf: string;
  telefone: string;
}

interface SignUpResult {
  error?: {
    message: string;
  };
  success?: boolean;
  message?: string;
}

const RATE_LIMIT = {
  MAX_ATTEMPTS: 3,
  WINDOW_MS: 60000, // 1 minuto
  KEY: 'instructor_signup_attempts'
};

const checkRateLimit = (): { allowed: boolean; remainingTime: number } => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(RATE_LIMIT.KEY) || '[]');
  
  // Remover tentativas antigas
  const recentAttempts = attempts.filter((timestamp: number) => 
    now - timestamp < RATE_LIMIT.WINDOW_MS
  );
  
  if (recentAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
    const oldestAttempt = Math.min(...recentAttempts);
    const remainingTime = Math.ceil((RATE_LIMIT.WINDOW_MS - (now - oldestAttempt)) / 1000);
    return { allowed: false, remainingTime };
  }
  
  return { allowed: true, remainingTime: 0 };
};

const updateRateLimit = () => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(RATE_LIMIT.KEY) || '[]');
  attempts.push(now);
  localStorage.setItem(RATE_LIMIT.KEY, JSON.stringify(attempts));
};

const signUp = async (email: string, fullName: string, cpf: string, telefone: string): Promise<SignUpResult> => {
  try {
    // Verificar rate limit
    const { allowed, remainingTime } = checkRateLimit();
    if (!allowed) {
      return { 
        error: { 
          message: `Muitas tentativas. Aguarde ${remainingTime} segundos antes de tentar novamente.` 
        } 
      };
    }

    // Atualizar contador de tentativas
    updateRateLimit();

    // Verificar se o instrutor já existe
    const { data: existingInstrutor, error: checkError } = await supabase
      .from('instrutores')
      .select('id')
      .or(`email.eq."${email}",cpf.eq."${cpf}"`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Erro ao verificar instrutor:', checkError);
      return { error: { message: 'Erro ao verificar instrutor existente' } };
    }

    if (existingInstrutor) {
      return { error: { message: 'Já existe um instrutor cadastrado com este email ou CPF' } };
    }

    // Obter a sessão da academia
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: { message: 'Usuário não autenticado' } };
    }

    // Gerar uma senha temporária forte
    const tempPassword = Math.random().toString(36).substring(2) + 
                        Math.random().toString(36).substring(2) + 
                        Math.random().toString(36).substring(2) +
                        Date.now().toString(36) +
                        '!@#$%';

    // Criar o usuário
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: tempPassword,
      options: {
        data: {
          profile_type: 'instrutor',
          full_name: fullName,
          email_verified: false,
          role: 'instructor',
          temp_pass: true // Marcar que é uma senha temporária
        },
        emailRedirectTo: `${window.location.origin}/instrutor/completar-cadastro`
      }
    });

    if (signUpError) {
      console.error('Erro no signup:', signUpError);
      return { error: signUpError };
    }

    if (!authData.user) {
      return { error: { message: 'Erro ao criar usuário' } };
    }

    // Inserir na tabela de instrutores
    const { data: profileData, error: profileError } = await supabase
      .rpc('insert_instrutor', {
        _user_id: authData.user.id,
        _full_name: fullName,
        _email: email,
        _cpf: cpf,
        _telefone: telefone,
        _cref: 'PENDENTE',
        _academia_email: session.user.email
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      
      // Se for erro de constraint, vamos tentar identificar qual campo está causando o problema
      if (profileError.code === '23514') {
        return { error: { message: 'Erro de validação nos dados. Verifique se todos os campos estão preenchidos corretamente.' } };
      }
      
      if (profileError.code === '23505') {
        if (profileError.message.includes('email')) {
          return { error: { message: 'Este email já está cadastrado' } };
        }
        if (profileError.message.includes('cpf')) {
          return { error: { message: 'Este CPF já está cadastrado' } };
        }
      }
      
      return { error: { message: 'Erro ao criar perfil do instrutor. Tente novamente.' } };
    }

    // Enviar email de redefinição de senha
    console.log('Tentando enviar email para:', email);
    const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/instrutor/completar-cadastro`
      }
    );

    if (resetError) {
      console.error('Erro detalhado ao enviar email:', {
        code: resetError.status,
        message: resetError.message,
        details: resetError
      });
      return { 
        error: { 
          message: `Erro ao enviar email de confirmação: ${resetError.message}` 
        } 
      };
    }

    console.log('Email enviado com sucesso:', resetData);

    // Armazenar email para uso posterior
    localStorage.setItem('instructor_email', email);

    return { 
      success: true,
      message: 'Instrutor convidado com sucesso! Um email será enviado em breve.'
    };
  } catch (error: any) {
    console.error('Erro inesperado:', error);
    return { 
      error: { 
        message: error.message || 'Erro ao processar a solicitação. Tente novamente mais tarde.' 
      } 
    };
  }
};

export default function InstructorInviteForm({ isOpen, onClose }: InstructorInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    fullName: '',
    cpf: '',
    telefone: ''
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev: number) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Aplicar formatação específica para cada campo
    switch (name) {
      case 'cpf':
        formattedValue = formatarCPF(value);
        break;
      case 'telefone':
        formattedValue = formatarTelefoneInternacional(value);
        break;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Limpar erros ao digitar
    setFormErrors(prev => ({
      ...prev,
      [name]: '',
      submit: ''
    }));
  };

  const validateForm = () => {
    const errors: FormErrors = {};

    // Validar email
    if (!validarEmail(formData.email)) {
      errors.email = 'Email inválido';
    }

    // Validar CPF
    if (!validarCPF(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }

    // Validar telefone (formato: (85) 98831-8679)
    if (!formData.telefone.match(/^\(\d{2}\)\s\d{5}-\d{4}$/)) {
      errors.telefone = 'Telefone inválido';
    }

    // Validar nome completo
    if (formData.fullName.trim().split(' ').length < 2) {
      errors.fullName = 'Digite o nome completo';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar rate limit antes de prosseguir
    const { allowed, remainingTime } = checkRateLimit();
    if (!allowed) {
      setFormErrors(prev => ({
        ...prev,
        submit: `Muitas tentativas. Aguarde ${remainingTime} segundos antes de tentar novamente.`
      }));
      setCooldown(remainingTime);
      return;
    }

    // Validar todos os campos
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      // Mostrar mensagem de envio
      setFormErrors(prev => ({
        ...prev,
        submit: 'Enviando email de convite...'
      }));

      // Formatar dados antes de enviar
      const formattedData = {
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ''),
        telefone: formData.telefone.replace(/\D/g, '')
      };

      const result = await signUp(
        formattedData.email,
        formattedData.fullName,
        formattedData.cpf,
        formattedData.telefone
      );
      
      if (result.error) {
        // Verificar se é erro de rate limit
        if (result.error.message?.toLowerCase().includes('rate limit')) {
          const waitTime = 60; // 1 minuto de espera
          setCooldown(waitTime);
          setFormErrors(prev => ({
            ...prev,
            submit: `Muitas tentativas em pouco tempo. Por favor, aguarde ${waitTime} segundos antes de tentar novamente.`
          }));
        } else {
          setFormErrors(prev => ({
            ...prev,
            submit: result.error?.message || 'Erro desconhecido'
          }));
        }
        return;
      }

      // Sucesso
      setFormErrors(prev => ({
        ...prev,
        submit: result.message || 'Instrutor convidado com sucesso!'
      }));
      
      // Limpar formulário após 3 segundos
      setTimeout(() => {
        setFormData({
          email: '',
          fullName: '',
          cpf: '',
          telefone: ''
        });
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('Erro ao convidar instrutor:', error);
      
      // Tratamento adicional para erro de rate limit
      if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
        const waitTime = 60;
        setCooldown(waitTime);
        setFormErrors(prev => ({
          ...prev,
          submit: `Muitas tentativas em pouco tempo. Por favor, aguarde ${waitTime} segundos antes de tentar novamente.`
        }));
      } else {
        setFormErrors(prev => ({
          ...prev,
          submit: 'Erro ao processar a solicitação. Tente novamente mais tarde.'
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background-card/95 backdrop-blur-xl rounded-2xl border border-white/5 p-6 w-full max-w-md relative overflow-y-auto max-h-[90vh]"
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-purple-light/70 hover:text-purple-light transition-colors"
        >
          <X size={20} />
        </button>

        {/* Título */}
        <h2 className="text-xl font-semibold text-white mb-2">Convidar Instrutor</h2>
        <p className="text-purple-light/70 text-sm mb-6">
          Envie um convite por email para o instrutor se juntar à sua academia
        </p>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-light/70" size={20} />
            <input
              type="email"
              name="email"
              value={formData.email}
              placeholder="Email do Instrutor"
              required
              onChange={handleInputChange}
              className={cn(
                "w-full bg-background/50 text-white placeholder-purple-light/50 border rounded-xl px-10 py-3 focus:outline-none transition-colors",
                formErrors.email 
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-purple-light/10 focus:border-purple-light/30"
              )}
            />
            {formErrors.email && (
              <span className="text-xs text-red-500 mt-1 ml-2">{formErrors.email}</span>
            )}
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-light/70" size={20} />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              placeholder="Nome Completo"
              required
              onChange={handleInputChange}
              className={cn(
                "w-full bg-background/50 text-white placeholder-purple-light/50 border rounded-xl px-10 py-3 focus:outline-none transition-colors",
                formErrors.fullName 
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-purple-light/10 focus:border-purple-light/30"
              )}
            />
            {formErrors.fullName && (
              <span className="text-xs text-red-500 mt-1 ml-2">{formErrors.fullName}</span>
            )}
          </div>

          <div className="relative">
            <IdentificationCard className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-light/70" size={20} />
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              placeholder="CPF (000.000.000-00)"
              required
              maxLength={14}
              onChange={handleInputChange}
              className={cn(
                "w-full bg-background/50 text-white placeholder-purple-light/50 border rounded-xl px-10 py-3 focus:outline-none transition-colors",
                formErrors.cpf 
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-purple-light/10 focus:border-purple-light/30"
              )}
            />
            {formErrors.cpf && (
              <span className="text-xs text-red-500 mt-1 ml-2">{formErrors.cpf}</span>
            )}
          </div>

          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-light/70" size={20} />
            <input
              type="text"
              name="telefone"
              value={formData.telefone}
              placeholder="Telefone ((00) 00000-0000)"
              required
              maxLength={15}
              onChange={handleInputChange}
              className={cn(
                "w-full bg-background/50 text-white placeholder-purple-light/50 border rounded-xl px-10 py-3 focus:outline-none transition-colors",
                formErrors.telefone 
                  ? "border-red-500/50 focus:border-red-500/70"
                  : "border-purple-light/10 focus:border-purple-light/30"
              )}
            />
            {formErrors.telefone && (
              <span className="text-xs text-red-500 mt-1 ml-2">{formErrors.telefone}</span>
            )}
          </div>

          <div className="space-y-3">
            {formErrors.submit && (
              <div className={cn(
                "flex items-center gap-2 text-sm p-3 rounded-lg border",
                formErrors.submit.includes('sucesso')
                  ? "bg-green-500/10 border-green-500/20 text-green-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              )}>
                <Warning size={20} />
                <span>{formErrors.submit}</span>
              </div>
            )}
            
            <motion.button 
              type="submit"
              disabled={loading || cooldown > 0}
              whileHover={{ scale: (loading || cooldown > 0) ? 1 : 1.02 }}
              whileTap={{ scale: (loading || cooldown > 0) ? 1 : 0.98 }}
              className={cn(
                "w-full bg-accent-blue text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-accent-blue/20 relative overflow-hidden group",
                (loading || cooldown > 0) && "opacity-70 cursor-not-allowed"
              )}
            >
              <span className="relative z-10">
                {loading ? 'Enviando...' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Convidar Instrutor'}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-purple opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}