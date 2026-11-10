package com.jeferson.gestaoacoes.repository;

import com.jeferson.gestaoacoes.model.Usuario;
import com.jeferson.gestaoacoes.model.PerfilUsuario;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Usuario> findAllByOrderByIdAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select u from Usuario u
             where u.perfil = :perfil
               and u.ativo = true
             order by u.id
            """)
    List<Usuario> findAtivosByPerfilForUpdate(@Param("perfil") PerfilUsuario perfil);
}
