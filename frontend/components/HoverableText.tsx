'use client';

import { useState, useRef, useCallback } from 'react';
import DefinitionTooltip from './DefinitionTooltip';
import { DefinitionResult } from '@/lib/agents/definition';

interface HoverableTextProps {
  text: string;
  accountId?: string;
  chatId?: string;
  className?: string;
}

interface HoverState {
  isVisible: boolean;
  position: { x: number; y: number };
  term: string;
  definition: DefinitionResult | null;
  loading: boolean;
}

export default function HoverableText({ 
  text, 
  accountId, 
  chatId, 
  className = "" 
}: HoverableTextProps) {
  const [hoverState, setHoverState] = useState<HoverState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    term: '',
    definition: null,
    loading: false
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const definitionCache = useRef<Map<string, DefinitionResult>>(new Map());

  // Detect potential terms that might need definitions
  const detectHoverableTerms = useCallback((text: string): string[] => {
    const terms = new Set<string>();
    
    // Define comprehensive term lists
    const businessTerms = ['API', 'SaaS', 'KPI', 'ROI', 'B2B', 'B2C', 'CRM', 'ERP', 'SEO', 'UI', 'UX', 'MVP', 'POC', 'QA', 'DevOps', 'CI', 'CD', 'AWS', 'GCP', 'AI', 'ML', 'IoT', 'VPN', 'SSL', 'HTTP', 'REST', 'GraphQL', 'JSON', 'XML', 'SQL', 'NoSQL', 'CRUD', 'MVC', 'ORM', 'JWT', 'OAuth', 'GDPR', 'HIPAA', 'SOC2', 'ISO', 'HTN'];
    
    const slangTerms = ['sus', 'vibe', 'cap', 'no cap', 'rizz', 'fire', 'GOAT', 'tweaking', 'bet', 'slay', 'periodt', 'stan', 'flex', 'based', 'cringe', 'simp', 'lowkey', 'highkey', 'deadass', 'fr', 'ngl', 'bussin', 'slaps', 'hits different', 'main character', 'understood the assignment', 'its giving', 'thats on period', 'and I oop', 'sksksk', 'vsco', 'aesthetic', 'soft girl', 'e-girl', 'alt', 'cottagecore', 'dark academia', 'light academia', 'goblincore', 'fairycore', 'coquette', 'clean girl', 'that girl', 'hot girl summer', 'villain era', 'soft launch', 'hard launch', 'beige flag', 'red flag', 'green flag', 'ick', 'the ick', 'situationship', 'talking stage', 'breadcrumbing', 'ghosting', 'orbiting', 'zombieing', 'cushioning', 'benching', 'stashing', 'cookie jarring', 'love bombing', 'gaslighting', 'mansplaining', 'womansplaining', 'Karen', 'Chad', 'Becky', 'Kyle', 'Boomer', 'Millennial', 'Gen Z', 'Gen Alpha', 'OK Boomer', 'cheugy', 'salty', 'pressed', 'triggered', 'woke', 'cancelled', 'ratio', 'L + ratio', 'touch grass', 'copium', 'hopium', 'redpilled', 'bluepilled', 'blackpilled', 'doomer', 'bloomer', 'coomer', 'wojak', 'pepe', 'chad', 'virgin', 'sigma', 'alpha', 'beta', 'omega', 'ligma', 'sugma', 'candice', 'joe mama', 'among us', 'amogus', 'imposter', 'vent', 'emergency meeting', 'self report', 'third imposter', 'poggers', 'pog', 'pogchamp', 'kappa', 'pepehands', 'monkas', '5head', '4head', '3head', 'smoothbrain', 'galaxy brain', 'big brain', 'smol brain', 'no thoughts head empty', 'one brain cell', 'sharing a brain cell', 'himbo', 'bimbo', 'thembo', 'malewife', 'girlboss', 'gaslight gatekeep girlboss', 'live laugh love', 'wine mom', 'soccer mom', 'cool mom', 'not like other girls', 'pick me', 'main character syndrome', 'NPC', 'side character', 'background character'];
    
    const techTerms = ['frontend', 'backend', 'fullstack', 'database', 'server', 'client', 'framework', 'library', 'repository', 'commit', 'push', 'pull', 'merge', 'branch', 'fork', 'clone', 'deploy', 'deployment', 'production', 'staging', 'development', 'localhost', 'debugging', 'refactor', 'optimize', 'algorithm', 'agile', 'scrum', 'kanban', 'sprint', 'backlog', 'docker', 'kubernetes', 'microservices', 'monolith', 'serverless', 'cloud', 'edge', 'CDN', 'cache', 'redis', 'elasticsearch', 'mongodb', 'postgresql', 'mysql', 'sqlite', 'firebase', 'supabase', 'vercel', 'netlify', 'heroku', 'digitalocean', 'github', 'gitlab', 'bitbucket', 'jenkins', 'travis', 'circleci', 'actions', 'pipeline', 'terraform', 'ansible', 'prometheus', 'grafana', 'datadog', 'newrelic', 'sentry', 'blockchain', 'cryptocurrency', 'bitcoin', 'ethereum', 'NFT', 'DeFi', 'web3', 'metaverse', 'VR', 'AR', 'MR', 'neural network', 'NLP', 'CV', 'tensorflow', 'pytorch', 'keras', 'scikit', 'pandas', 'numpy', 'jupyter', 'colab', 'kaggle', 'openai', 'GPT', 'BERT', 'transformer'];
    
    // Split text into words and phrases
    const words = text.split(/\s+/);
    
    // Check each word
    words.forEach((word, index) => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length < 2 || cleaned.length > 30) return;
      
      const lowerWord = cleaned.toLowerCase();
      
      // 1. Business/professional terms and acronyms (2-5 uppercase letters)
      if (/^[A-Z]{2,5}$/.test(cleaned)) {
        terms.add(cleaned);
        return;
      }
      
      // 2. Check against business terms list
      if (businessTerms.some(term => term.toLowerCase() === lowerWord)) {
        terms.add(cleaned);
        return;
      }
      
      // 3. Check against slang terms list
      if (slangTerms.some(term => term.toLowerCase() === lowerWord)) {
        terms.add(cleaned);
        return;
      }
      
      // 4. Check against tech terms list
      if (techTerms.some(term => term.toLowerCase() === lowerWord)) {
        terms.add(cleaned);
        return;
      }
      
      // 5. Company names and brand references (capitalized words)
      if (/^[A-Z][a-z]+/.test(cleaned) && cleaned.length > 2) {
        terms.add(cleaned);
        return;
      }
      
      // 6. Technical terms (camelCase or PascalCase)
      if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(cleaned) || /^[A-Z][a-z]+[A-Z][a-zA-Z]*$/.test(cleaned)) {
        terms.add(cleaned);
        return;
      }
      
      // 7. Words in ALL CAPS (potential emphasis/slang)
      if (/^[A-Z]{3,}$/.test(cleaned)) {
        terms.add(cleaned);
        return;
      }
    });
    
    // Check for multi-word phrases
    const multiWordPhrases = ['no cap', 'hits different', 'main character', 'understood the assignment', 'its giving', 'thats on period', 'and I oop', 'soft girl', 'dark academia', 'light academia', 'clean girl', 'that girl', 'hot girl summer', 'villain era', 'soft launch', 'hard launch', 'beige flag', 'red flag', 'green flag', 'the ick', 'talking stage', 'love bombing', 'cookie jarring', 'Gen Z', 'Gen Alpha', 'OK Boomer', 'L + ratio', 'touch grass', 'joe mama', 'among us', 'emergency meeting', 'self report', 'third imposter', 'galaxy brain', 'big brain', 'smol brain', 'no thoughts head empty', 'one brain cell', 'sharing a brain cell', 'gaslight gatekeep girlboss', 'live laugh love', 'wine mom', 'soccer mom', 'cool mom', 'not like other girls', 'pick me', 'main character syndrome', 'side character', 'background character', 'neural network'];
    
    multiWordPhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        terms.add(phrase);
      }
    });
    
    // Also check for hashtags and @mentions
    const hashtagMatches = text.match(/#\w+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach(match => {
        const cleaned = match.replace('#', '');
        if (cleaned.length > 2) terms.add(cleaned);
      });
    }
    
    const mentionMatches = text.match(/@\w+/g);
    if (mentionMatches) {
      mentionMatches.forEach(match => {
        const cleaned = match.replace('@', '');
        if (cleaned.length > 2) terms.add(cleaned);
      });
    }

    return Array.from(terms).slice(0, 50); // Limit to 50 terms to avoid API limits
  }, []);

  // Fetch definition from API
  const fetchDefinition = useCallback(async (term: string): Promise<DefinitionResult | null> => {
    if (!accountId || !chatId) return null;

    // Check cache first
    if (definitionCache.current.has(term.toLowerCase())) {
      return definitionCache.current.get(term.toLowerCase()) ?? null;
    }

    try {
      const accessToken = process.env.NEXT_PUBLIC_BEEPER_ACCESS_TOKEN;
      const cohereApiKey = process.env.NEXT_PUBLIC_COHERE_API_KEY;
      
      if (!accessToken) {
        console.warn('No Beeper access token available');
        return null;
      }

      if (!cohereApiKey) {
        console.warn('No Cohere API key available');
        return null;
      }

      const response = await fetch('/api/agents/definition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-cohere-api-key': cohereApiKey,
        },
        body: JSON.stringify({
          accountId,
          chatId,
          limit: 20, // Smaller limit for faster response
          terms: [term] // Only define the specific term
        })
      });

      if (!response.ok) {
        console.error(`Definition API error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return null;
      }

      const data = await response.json();
      console.log('Definition API response:', data);
      const definition = data.definitions?.[0] || null;
      console.log('Extracted definition:', definition);

      // Cache the result
      if (definition) {
        definitionCache.current.set(term.toLowerCase(), definition);
      }

      return definition;
    } catch (error) {
      console.error(`Error fetching definition: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }, [accountId, chatId]);

  // Handle mouse enter on potential terms
  const handleMouseEnter = useCallback((event: React.MouseEvent, term: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX,
      y: event.clientY
    };

    setHoverState({
      isVisible: true,
      position,
      term,
      definition: null,
      loading: true
    });

    // Fetch definition with a slight delay to avoid excessive API calls
    timeoutRef.current = setTimeout(async () => {
      const definition = await fetchDefinition(term);
      setHoverState(prev => ({
        ...prev,
        definition,
        loading: false
      }));
    }, 300);
  }, [fetchDefinition]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Hide tooltip after a short delay
    timeoutRef.current = setTimeout(() => {
      setHoverState(prev => ({
        ...prev,
        isVisible: false
      }));
    }, 100);
  }, []);

  // Render text with hoverable terms
  const renderHoverableText = useCallback((text: string) => {
    const hoverableTerms = detectHoverableTerms(text);
    
    if (hoverableTerms.length === 0) {
      return <span>{text}</span>;
    }

    // Create a regex that matches any of the hoverable terms
    const termPattern = new RegExp(
      `\\b(${hoverableTerms.map(term => 
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ).join('|')})\\b`,
      'gi'
    );

    const parts = text.split(termPattern);
    
    return (
      <>
        {parts.map((part, index) => {
          const isHoverableTerm = hoverableTerms.some(term => 
            term.toLowerCase() === part.toLowerCase()
          );
          
          if (isHoverableTerm) {
            return (
              <span
                key={index}
                className="cursor-help bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b-2 border-purple-400/60 hover:border-purple-300 hover:from-purple-500/30 hover:to-blue-500/30 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 rounded-sm px-1 py-0.5 font-medium text-purple-100 hover:text-white hover:scale-105 transform"
                onMouseEnter={(e) => handleMouseEnter(e, part)}
                onMouseLeave={handleMouseLeave}
              >
                {part}
              </span>
            );
          }
          
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  }, [detectHoverableTerms, handleMouseEnter, handleMouseLeave]);

  return (
    <div className={className}>
      {renderHoverableText(text)}
      
      <DefinitionTooltip
        isVisible={hoverState.isVisible}
        position={hoverState.position}
        definition={hoverState.definition}
        loading={hoverState.loading}
      />
    </div>
  );
}
