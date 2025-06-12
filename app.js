// Clase para manejar los gastos
class DebtManager {
    constructor() {
        this.debts = [];
        this.clonedDebts = [];
        this.lastCloneDate = null;
        this.currentFilter = 'all';
        this.sortDirection = 'desc';
        
        // Inicializar elementos del formulario
        this.form = document.getElementById('debtForm');
        this.descriptionInput = document.getElementById('description');
        this.amountInput = document.getElementById('amount');
        this.dueDateInput = document.getElementById('dueDate');
        this.statusInput = document.getElementById('status');
        this.addDebtBtn = document.getElementById('addDebt');
        this.deleteAllBtn = document.getElementById('deleteAll');
        this.duplicateBtn = document.getElementById('duplicate');
        this.sortBtn = document.getElementById('sortBtn');

        // Verificar elementos requeridos
        const requiredElements = {
            'Formulario': this.form,
            'Campo de descripción': this.descriptionInput,
            'Campo de monto': this.amountInput,
            'Campo de fecha': this.dueDateInput
        };

        const missingElements = Object.entries(requiredElements)
            .filter(([_, element]) => !element)
            .map(([name]) => name);

        if (missingElements.length > 0) {
            throw new Error(`No se encontraron los siguientes elementos: ${missingElements.join(', ')}`);
        }

        this.loadDebts();
        this.setupEventListeners();
        this.updateDebtsList();
        this.updateTotals();
        this.checkUpcomingDebts();
        this.checkOverdueDebts();
    }

    setupEventListeners() {
        // Event listener para el formulario de agregar deuda
        const debtForm = document.getElementById('debtForm');
        if (debtForm) {
            debtForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addDebt();
            });
        }

        // Event listener para el botón de duplicar
        const duplicateButton = document.getElementById('duplicateButton');
        if (duplicateButton) {
            duplicateButton.addEventListener('click', () => {
                this.duplicateLastMonthEntries();
            });
        }

        // Event listener para el botón de ver clonados
        const viewClonedButton = document.getElementById('viewClonedButton');
        if (viewClonedButton) {
            viewClonedButton.addEventListener('click', () => {
                this.viewClonedDebts();
            });
        }

        // Event listeners para los botones de filtro
        document.querySelectorAll('.filter-buttons button').forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                if (filter) {
                    this.filterDebts(filter);
                }
            });
        });

        // Event listener para el botón de ordenar
        const sortBtn = document.getElementById('sortBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => {
                this.toggleSort();
            });
        }

        // Event listener para el botón de eliminar todos
        const deleteAllButton = document.getElementById('deleteAll');
        if (deleteAllButton) {
            deleteAllButton.addEventListener('click', () => {
                if (confirm('¿Estás seguro de que deseas eliminar todos los gastos? Esta acción no se puede deshacer.')) {
                    // Limpiar el array de deudas
                    this.debts = [];
                    // Limpiar el array de deudas clonadas
                    this.clonedDebts = [];
                    // Guardar los cambios
                    this.saveDebts();
                    // Mostrar notificación
                    this.showNotification('Todos los gastos han sido eliminados', 'success');
                    // Actualizar la vista
                    this.updateDebtsList();
                    // Actualizar los totales
                    this.updateTotals();
                    // Actualizar los contadores
                    this.checkUpcomingDebts();
                    this.checkOverdueDebts();
                }
            });
        }

        // Event listener para el botón de ver gastos clonados
        const viewClonedBtn = document.getElementById('viewCloned');
        if (viewClonedBtn) {
            viewClonedBtn.addEventListener('click', () => {
                this.viewClonedDebts();
            });
        }

        // Event listener para el botón de exportar
        const exportButton = document.getElementById('exportButton');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                this.exportToExcel();
            });
        }

        // Event listener para el botón de importar
        const importButton = document.getElementById('importButton');
        if (importButton) {
            importButton.addEventListener('click', () => {
                document.getElementById('importInput').click();
            });
        }

        // Event listener para el input de importar
        const importInput = document.getElementById('importInput');
        if (importInput) {
            importInput.addEventListener('change', (e) => {
                this.importFromExcel(e);
            });
        }
    }

    addDebt() {
        try {
            // Obtener los valores del formulario
            const description = document.getElementById('description').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            const dueDate = document.getElementById('dueDate').value;

            // Validar los datos
            if (!description) {
                throw new Error('La descripción es requerida');
            }
            if (isNaN(amount) || amount <= 0) {
                throw new Error('El monto debe ser un número positivo');
            }
            if (!dueDate) {
                throw new Error('La fecha de vencimiento es requerida');
            }

            // Crear el nuevo gasto
            const newDebt = {
                id: Date.now(), // Usar timestamp como ID único
                description,
                amount,
                dueDate,
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            console.log('Agregando nueva deuda:', newDebt); // Debug log

            // Agregar a la lista de deudas
            this.debts.push(newDebt);

            // Guardar en localStorage
            this.saveDebts();

            // Actualizar la vista
            this.updateDebtsList();
            this.updateTotals();

            // Limpiar el formulario
            document.getElementById('debtForm').reset();

            // Mostrar notificación
            this.showNotification('Gasto agregado exitosamente', 'success');
        } catch (error) {
            console.error('Error al agregar gasto:', error);
            this.showNotification('Error al agregar gasto: ' + error.message, 'error');
        }
    }

    showAddModal() {
        const modal = document.getElementById('addDebtModal');
        if (modal) {
            const bootstrapModal = new bootstrap.Modal(modal);
            bootstrapModal.show();
        }
    }

    hideAddModal() {
        const modal = document.getElementById('addDebtModal');
        if (modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    }

    updateDebtsList() {
        try {
            const debtsList = document.getElementById('debtsList');
            if (!debtsList) return;

            // Ordenar deudas por fecha de vencimiento
            const sortedDebts = [...this.debts].sort((a, b) => {
                const dateA = new Date(a.dueDate);
                const dateB = new Date(b.dueDate);
                return dateA - dateB;
            });

            // Crear contenido para mostrar las deudas
            let content = '';

            sortedDebts.forEach(debt => {
                const date = new Date(debt.dueDate);
                const isOverdue = date < new Date() && debt.status === 'pending';
                
                const formattedDate = date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                content += `
                    <tr class="${isOverdue ? 'table-danger' : ''}">
                        <td>${debt.description}</td>
                        <td>$${Math.round(debt.amount)}</td>
                        <td>${formattedDate}</td>
                        <td>
                            <span class="badge bg-${debt.status === 'paid' ? 'success' : 'warning'}">
                                ${debt.status === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                        </td>
                        <td>
                            <div class="btn-group">
                                ${debt.status === 'pending' ? `
                                    <button class="btn btn-sm btn-success toggle-status" data-id="${debt.id}">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : `
                                    <button class="btn btn-sm btn-warning toggle-status" data-id="${debt.id}">
                                        <i class="fas fa-undo"></i>
                                    </button>
                                `}
                                <button class="btn btn-sm btn-danger delete-debt" data-id="${debt.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            // Actualizar el contenido
            debtsList.innerHTML = content;

            // Agregar event listeners para los botones de borrar
            debtsList.querySelectorAll('.delete-debt').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    this.deleteDebt(id);
                });
            });

            // Agregar event listeners para los botones de cambiar estado
            debtsList.querySelectorAll('.toggle-status').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    this.toggleStatus(id);
                });
            });

            // Actualizar contadores
            this.updateTotals();
        } catch (error) {
            console.error('Error al actualizar la lista de deudas:', error);
            this.showNotification('Error al actualizar la lista: ' + error.message, 'error');
        }
    }

    toggleStatus(id) {
        try {
            // Buscar la deuda en el array
            const debtIndex = this.debts.findIndex(d => d.id === id);
            if (debtIndex === -1) {
                console.error('Deuda no encontrada con ID:', id);
                console.log('Deudas disponibles:', this.debts);
                throw new Error('Deuda no encontrada');
            }

            // Cambiar el estado
            this.debts[debtIndex].status = this.debts[debtIndex].status === 'paid' ? 'pending' : 'paid';
            
            // Guardar los cambios
            this.saveDebts();
            
            // Actualizar la vista
            this.updateDebtsList();
            
            // Mostrar notificación
            this.showNotification(
                `Deuda ${this.debts[debtIndex].status === 'paid' ? 'marcada como pagada' : 'marcada como pendiente'}`,
                'success'
            );

            // Actualizar contadores
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
        } catch (error) {
            console.error('Error al cambiar el estado:', error);
            this.showNotification('Error al cambiar el estado: ' + error.message, 'error');
        }
    }

    editDebt(id) {
        try {
            const debt = this.debts.find(d => d.id === id);
            if (!debt) {
                this.showNotification('No se encontró el gasto a editar', 'error');
                return;
            }

            // Llenar el formulario con los datos del gasto
            this.descriptionInput.value = debt.description;
            this.amountInput.value = debt.amount;
            this.dueDateInput.value = debt.dueDate;
            this.statusInput.value = debt.status;

            // Cambiar el botón de agregar a guardar
            const addButton = document.getElementById('addDebt');
            addButton.innerHTML = '<i class="fas fa-save me-2"></i>Guardar';
            addButton.classList.remove('btn-primary');
            addButton.classList.add('btn-warning');

            // Guardar el ID del gasto que se está editando
            addButton.dataset.editId = id;

            // Hacer scroll al formulario
            this.form.scrollIntoView({ behavior: 'smooth' });

            this.showNotification('Modifica los datos y haz clic en Guardar', 'info');
        } catch (error) {
            console.error('Error al preparar la edición:', error);
            this.showNotification('Error al preparar la edición: ' + error.message, 'error');
        }
    }

    deleteDebt(id) {
        try {
            if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
                return;
            }

            const debtIndex = this.debts.findIndex(debt => debt.id === id);
            if (debtIndex === -1) {
                this.showNotification('No se encontró el gasto a eliminar', 'error');
                return;
            }

            this.debts.splice(debtIndex, 1);
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
            this.showNotification('Gasto eliminado exitosamente', 'success');
        } catch (error) {
            console.error('Error al eliminar el gasto:', error);
            this.showNotification('Error al eliminar el gasto: ' + error.message, 'error');
        }
    }

    deleteAllDebts() {
        try {
            this.debts = [];
            this.saveDebts();
            this.updateDebtsList();
            this.updateTotals();
            this.checkUpcomingDebts();
            this.checkOverdueDebts();
            this.showNotification('Todos los gastos han sido eliminados', 'success');
        } catch (error) {
            console.error('Error al eliminar todos los gastos:', error);
            this.showNotification('Error al eliminar todos los gastos: ' + error.message, 'error');
        }
    }

    duplicateLastMonthEntries() {
        try {
            if (this.debts.length === 0) {
                this.showNotification('No hay gastos para duplicar', 'warning');
                return;
            }

            // Obtener todas las deudas actuales
            let debtsToClone = [...this.debts];

            // Si hay un filtro activo, solo clonar las deudas filtradas
            if (this.currentFilter !== 'all') {
                debtsToClone = debtsToClone.filter(debt => {
                    const dueDate = new Date(debt.dueDate);
                    const isOverdue = dueDate < new Date() && debt.status === 'pending';
                    
                    if (this.currentFilter === 'overdue') {
                        return isOverdue;
                    } else if (this.currentFilter === 'pending') {
                        return debt.status === 'pending' && !isOverdue;
                    } else {
                        return debt.status === this.currentFilter;
                    }
                });
            }

            if (debtsToClone.length === 0) {
                this.showNotification('No hay gastos para duplicar con el filtro actual', 'warning');
                return;
            }

            // Guardar los gastos originales en la lista de clonados
            const originalDebts = debtsToClone.map(debt => ({
                ...debt,
                isOriginal: true,
                clonedAt: new Date().toISOString()
            }));

            // Crear nuevos gastos para el mes siguiente
            const newDebts = debtsToClone.map(debt => {
                const oldDate = new Date(debt.dueDate);
                const newDate = new Date(oldDate);
                newDate.setMonth(oldDate.getMonth() + 1);

                return {
                    id: Date.now() + Math.random(),
                    description: debt.description,
                    amount: debt.amount,
                    dueDate: newDate.toISOString().split('T')[0],
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    originalDebtId: debt.id, // Guardar referencia al gasto original
                    isOriginal: false,
                    clonedAt: new Date().toISOString()
                };
            });

            // Agregar los nuevos gastos a la lista principal
            this.debts = [...this.debts, ...newDebts];
            
            // Agregar tanto los originales como los nuevos a la lista de clonados
            this.clonedDebts = [...this.clonedDebts, ...originalDebts, ...newDebts];
            
            // Guardar cambios
            this.saveDebts();
            
            // Actualizar la vista
            this.updateDebtsList();
            this.updateTotals();

            this.showNotification(`Se han duplicado ${newDebts.length} gastos para el mes siguiente`, 'success');
        } catch (error) {
            console.error('Error al duplicar gastos:', error);
            this.showNotification('Error al duplicar gastos: ' + error.message, 'error');
        }
    }

    viewClonedDebts() {
        try {
            if (!this.clonedDebts || this.clonedDebts.length === 0) {
                this.showNotification('No hay gastos clonados para mostrar', 'info');
                return;
            }

            // Ordenar por fecha de clonación
            const sortedClonedDebts = [...this.clonedDebts].sort((a, b) => {
                const dateA = new Date(a.clonedAt);
                const dateB = new Date(b.clonedAt);
                return dateB - dateA;
            });

            // Crear contenido para mostrar los gastos clonados
            let content = '<div class="row g-3">';

            sortedClonedDebts.forEach(debt => {
                const date = new Date(debt.dueDate);
                const clonedDate = new Date(debt.clonedAt);
                const isOverdue = date < new Date() && debt.status === 'pending';
                
                const formattedDate = date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                const formattedClonedDate = clonedDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // Calcular días restantes
                const diffTime = date - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isAboutToExpire = diffDays <= 2 && diffDays >= 0 && debt.status === 'pending';

                // Mensaje de alerta
                let alertMessage = '';
                if (isOverdue) {
                    alertMessage = `
                        <div class="alert alert-danger mt-2 mb-0">
                            <i class="fas fa-exclamation-circle me-2"></i>
                            Esta deuda está vencida hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}
                        </div>
                    `;
                } else if (isAboutToExpire) {
                    alertMessage = `
                        <div class="alert alert-warning mt-2 mb-0">
                            <i class="fas fa-clock me-2"></i>
                            Esta deuda vence en ${diffDays} día${diffDays !== 1 ? 's' : ''}
                        </div>
                    `;
                }

                content += `
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="card h-100 ${isOverdue ? 'border-danger' : ''}">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <h6 class="card-title mb-0">${debt.description}</h6>
                                    <span class="badge bg-${debt.isOriginal ? 'info' : 'secondary'}">
                                        ${debt.isOriginal ? 'Original' : 'Clonado'}
                                    </span>
                                </div>
                                ${alertMessage}
                                <div class="row mt-3">
                                    <div class="col-6">
                                        <small class="text-muted d-block">Monto</small>
                                        <strong>$${Math.round(debt.amount)}</strong>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block">Vencimiento</small>
                                        <strong>${formattedDate}</strong>
                                    </div>
                                </div>
                                <div class="row mt-2">
                                    <div class="col-6">
                                        <small class="text-muted d-block">Estado</small>
                                        <span class="badge bg-${debt.status === 'paid' ? 'success' : 'warning'}">
                                            ${debt.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </div>
                                    <div class="col-6">
                                        <small class="text-muted d-block">Clonado</small>
                                        <small>${formattedClonedDate}</small>
                                    </div>
                                </div>
                                <div class="d-flex justify-content-end mt-3">
                                    <button class="btn btn-sm btn-danger delete-cloned" data-id="${debt.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            content += `
                </div>
                <div class="mt-3 d-flex justify-content-between align-items-center">
                    <p class="text-muted mb-0">
                        <i class="fas fa-info-circle me-2"></i>
                        Total de gastos clonados: ${sortedClonedDebts.length}
                    </p>
                    <button type="button" class="btn btn-danger" id="deleteAllCloned">
                        <i class="fas fa-trash me-2"></i>Eliminar Todos
                    </button>
                </div>
            `;

            // Mostrar en un modal
            const modal = document.getElementById('clonedDebtsModal');
            if (modal) {
                const modalBody = modal.querySelector('.modal-body');
                if (modalBody) {
                    modalBody.innerHTML = content;
                    const bootstrapModal = new bootstrap.Modal(modal);
                    bootstrapModal.show();

                    // Agregar event listeners para los botones de borrado individual
                    modalBody.querySelectorAll('.delete-cloned').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const id = e.currentTarget.dataset.id;
                            this.deleteClonedDebt(id);
                        });
                    });

                    // Agregar event listener para borrar todos
                    const deleteAllButton = modalBody.querySelector('#deleteAllCloned');
                    if (deleteAllButton) {
                        deleteAllButton.onclick = () => {
                            if (confirm('¿Estás seguro de que deseas eliminar todos los gastos clonados? Esta acción no se puede deshacer.')) {
                                this.clonedDebts = [];
                                this.saveDebts();
                                bootstrapModal.hide();
                                this.showNotification('Todos los gastos clonados han sido eliminados', 'success');
                                this.updateDebtsList();
                                this.updateTotals();
                            }
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Error al mostrar gastos clonados:', error);
            this.showNotification('Error al mostrar gastos clonados: ' + error.message, 'error');
        }
    }

    deleteClonedDebt(id) {
        try {
            if (confirm('¿Estás seguro de que deseas eliminar este gasto clonado?')) {
                // Convertir el id a número si es necesario
                const debtId = typeof id === 'string' ? parseFloat(id) : id;
                
                // Filtrar el gasto clonado
                this.clonedDebts = this.clonedDebts.filter(debt => debt.id !== debtId);
                
                // Guardar cambios
                this.saveDebts();
                
                // Cerrar el modal actual
                const modal = document.getElementById('clonedDebtsModal');
                if (modal) {
                    const bootstrapModal = bootstrap.Modal.getInstance(modal);
                    if (bootstrapModal) {
                        bootstrapModal.hide();
                    }
                }
                
                // Mostrar notificación
                this.showNotification('Gasto clonado eliminado correctamente', 'success');
                
                // Volver a abrir el modal con la lista actualizada
                setTimeout(() => {
                    this.viewClonedDebts();
                }, 300);
            }
        } catch (error) {
            console.error('Error al eliminar gasto clonado:', error);
            this.showNotification('Error al eliminar gasto clonado: ' + error.message, 'error');
        }
    }

    saveDebts() {
        localStorage.setItem('debts', JSON.stringify(this.debts));
        localStorage.setItem('clonedDebts', JSON.stringify(this.clonedDebts));
        localStorage.setItem('lastCloneDate', JSON.stringify(this.lastCloneDate));
    }

    loadDebts() {
        try {
            const savedDebts = localStorage.getItem('debts');
            if (savedDebts) {
                this.debts = JSON.parse(savedDebts);
            }
        } catch (error) {
            console.error('Error al cargar los gastos:', error);
            this.showNotification('Error al cargar los gastos: ' + error.message, 'error');
        }
    }

    updateTotals() {
        try {
            const totalAmount = this.debts.reduce((sum, debt) => sum + debt.amount, 0);
            const paidAmount = this.debts
                .filter(debt => debt.status === 'paid')
                .reduce((sum, debt) => sum + debt.amount, 0);
            const pendingAmount = this.debts
                .filter(debt => debt.status === 'pending')
                .reduce((sum, debt) => sum + debt.amount, 0);
            const overdueAmount = this.debts
                .filter(debt => {
                    const dueDate = new Date(debt.dueDate);
                    return dueDate < new Date() && debt.status === 'pending';
                })
                .reduce((sum, debt) => sum + debt.amount, 0);

            // Actualizar montos totales
            const elements = {
                totalAmount: document.getElementById('totalAmount'),
                paidAmount: document.getElementById('totalPaid'),
                pendingAmount: document.getElementById('totalPending'),
                overdueAmount: document.getElementById('totalOverdue')
            };

            // Verificar y actualizar cada elemento
            if (elements.totalAmount) elements.totalAmount.textContent = `$${Math.round(totalAmount)}`;
            if (elements.paidAmount) elements.paidAmount.textContent = `$${Math.round(paidAmount)}`;
            if (elements.pendingAmount) elements.pendingAmount.textContent = `$${Math.round(pendingAmount)}`;
            if (elements.overdueAmount) elements.overdueAmount.textContent = `$${Math.round(overdueAmount)}`;

            // Actualizar porcentajes
            const paidPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
            const pendingPercentage = totalAmount > 0 ? (pendingAmount / totalAmount) * 100 : 0;
            const overduePercentage = totalAmount > 0 ? (overdueAmount / totalAmount) * 100 : 0;

            // Actualizar elementos de porcentaje
            const percentageElements = {
                paidPercentage: document.getElementById('paidPercentage'),
                pendingPercentage: document.getElementById('pendingPercentage'),
                overduePercentage: document.getElementById('overduePercentage')
            };

            if (percentageElements.paidPercentage) percentageElements.paidPercentage.textContent = `${Math.round(paidPercentage)}%`;
            if (percentageElements.pendingPercentage) percentageElements.pendingPercentage.textContent = `${Math.round(pendingPercentage)}%`;
            if (percentageElements.overduePercentage) percentageElements.overduePercentage.textContent = `${Math.round(overduePercentage)}%`;

            // Actualizar barras de progreso
            const progressElements = {
                paidProgress: document.getElementById('paidProgress'),
                pendingProgress: document.getElementById('pendingProgress'),
                overdueProgress: document.getElementById('overdueProgress')
            };

            if (progressElements.paidProgress) progressElements.paidProgress.style.width = `${paidPercentage}%`;
            if (progressElements.pendingProgress) progressElements.pendingProgress.style.width = `${pendingPercentage}%`;
            if (progressElements.overdueProgress) progressElements.overdueProgress.style.width = `${overduePercentage}%`;

            // Actualizar título de la página
            document.title = `Control de Gastos - Pendiente: $${Math.round(pendingAmount)}`;
        } catch (error) {
            console.error('Error al actualizar totales:', error);
            this.showNotification('Error al actualizar totales: ' + error.message, 'error');
        }
    }

    checkUpcomingDebts() {
        try {
            const today = new Date();
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);

            const upcomingDebts = this.debts.filter(debt => {
                const dueDate = new Date(debt.dueDate);
                return debt.status === 'pending' && dueDate > today && dueDate <= threeDaysFromNow;
            });

            const upcomingDebtsList = document.getElementById('upcomingDebtsList');
            if (upcomingDebtsList) {
                if (upcomingDebts.length === 0) {
                    upcomingDebtsList.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-check-circle fa-2x mb-2"></i>
                            <p class="mb-0">No hay gastos próximos</p>
                        </div>
                    `;
                } else {
                    upcomingDebtsList.innerHTML = upcomingDebts.map(debt => {
                        const dueDate = new Date(debt.dueDate);
                        const formattedDate = dueDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        return `
                            <div class="upcoming-debt-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${debt.description}</h6>
                                        <p class="mb-0 text-muted">Vence: ${formattedDate}</p>
                                    </div>
                                    <div class="text-end">
                                        <h6 class="mb-1">$${debt.amount}</h6>
                                        <button class="btn btn-sm btn-success" onclick="debtManager.updateStatus(${debt.id}, 'paid')">
                                            <i class="bi bi-check-circle-fill"></i> Pagar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error al verificar gastos próximos:', error);
            this.showNotification('Error al verificar gastos próximos: ' + error.message, 'error');
        }
    }

    checkOverdueDebts() {
        try {
            const today = new Date();
            const overdueDebts = this.debts.filter(debt => {
                const dueDate = new Date(debt.dueDate);
                return debt.status === 'pending' && dueDate < today;
            });

            const overdueDebtsList = document.getElementById('overdueDebtsList');
            if (overdueDebtsList) {
                if (overdueDebts.length === 0) {
                    overdueDebtsList.innerHTML = `
                        <div class="text-center text-muted py-3">
                            <i class="fas fa-check-circle fa-2x mb-2"></i>
                            <p class="mb-0">No hay gastos vencidos</p>
                        </div>
                    `;
                } else {
                    overdueDebtsList.innerHTML = overdueDebts.map(debt => {
                        const dueDate = new Date(debt.dueDate);
                        const formattedDate = dueDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                        });
                        return `
                            <div class="overdue-debt-item">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${debt.description}</h6>
                                        <p class="mb-0 text-muted">Vencido: ${formattedDate}</p>
                                    </div>
                                    <div class="text-end">
                                        <h6 class="mb-1">$${debt.amount}</h6>
                                        <button class="btn btn-sm btn-success" onclick="debtManager.updateStatus(${debt.id}, 'paid')">
                                            <i class="bi bi-check-circle-fill"></i> Pagar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error al verificar gastos vencidos:', error);
            this.showNotification('Error al verificar gastos vencidos: ' + error.message, 'error');
        }
    }

    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `alert alert-${type} notification`;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        } catch (error) {
            console.error('Error al mostrar la notificación:', error);
        }
    }

    toggleSort() {
        try {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
            const sortBtn = document.getElementById('sortBtn');
            if (sortBtn) {
                sortBtn.innerHTML = `<i class="fas fa-sort-${this.sortDirection === 'desc' ? 'down' : 'up'} me-2"></i>Ordenar por Fecha`;
            }
            this.updateDebtsList();
        } catch (error) {
            console.error('Error al cambiar el orden:', error);
            this.showNotification('Error al cambiar el orden: ' + error.message, 'error');
        }
    }
}

// Inicializar el gestor de gastos
const debtManager = new DebtManager();