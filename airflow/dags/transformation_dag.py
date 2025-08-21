"""
SearchFlow Transformation DAG

Runs dbt transformations to build staging, intermediate, and mart models.
Runs hourly.
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator


default_args = {
    'owner': 'searchflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=2),
}

# dbt command prefix
DBT_DIR = '/dbt'
DBT_CMD = f'cd {DBT_DIR} && dbt'


with DAG(
    'searchflow_transformation',
    default_args=default_args,
    description='Run dbt transformations',
    schedule_interval='0 * * * *',  # Hourly
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['transformation', 'dbt', 'searchflow'],
    max_active_runs=1,
) as dag:
    
    start = EmptyOperator(task_id='start')
    
    # Install dbt packages (deps)
    dbt_deps = BashOperator(
        task_id='dbt_deps',
        bash_command=f'{DBT_CMD} deps',
    )
    
    # Run staging models
    dbt_run_staging = BashOperator(
        task_id='dbt_run_staging',
        bash_command=f'{DBT_CMD} run --select staging',
    )
    
    # Run intermediate models
    dbt_run_intermediate = BashOperator(
        task_id='dbt_run_intermediate',
        bash_command=f'{DBT_CMD} run --select intermediate',
    )
    
    # Run mart models
    dbt_run_marts = BashOperator(
        task_id='dbt_run_marts',
        bash_command=f'{DBT_CMD} run --select marts',
    )
    
    # Run all tests
    dbt_test = BashOperator(
        task_id='dbt_test',
        bash_command=f'{DBT_CMD} test',
    )
    
    # Generate documentation (optional, for debugging)
    dbt_docs = BashOperator(
        task_id='dbt_docs_generate',
        bash_command=f'{DBT_CMD} docs generate',
    )
    
    end = EmptyOperator(task_id='end')
    
    # Linear pipeline: deps → staging → intermediate → marts → test → docs
    (
        start 
        >> dbt_deps 
        >> dbt_run_staging 
        >> dbt_run_intermediate 
        >> dbt_run_marts 
        >> dbt_test 
        >> dbt_docs 
        >> end
    )
